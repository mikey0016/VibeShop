"""O'yinchi ID tekshiruv — tashqi provider yoki env override."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlencode

import httpx

from config import (
    FFDATA_API_BASE,
    FFDATA_API_KEY,
    FREEFIRE_INFO_API_BASE,
    FREEFIRE_REGION,
    FREEFIRE_REGION_FALLBACKS,
    FREEFIRE_UID_INFO_API,
    GAME_VERIFY_OVERRIDES,
    GAME_VERIFY_URLS,
    HLGAMING_API_KEY,
    HLGAMING_USERUID,
)

SUPPORTED_GAMES = frozenset(
    {"freefire", "pubg", "bloodstrike", "magicchess", "deltaforce", "shootloot", "standoff2"}
)

FFDATA_REGION = "ind"


class VerifyError(ValueError):
    def __init__(self, message: str, *, code: str = "not_found") -> None:
        super().__init__(message)
        self.code = code


def _region_candidates(preferred: str | None) -> list[str]:
    pref = (preferred or FREEFIRE_REGION or "RU").strip().upper()
    regions = [pref] if pref else []
    for part in FREEFIRE_REGION_FALLBACKS.split(","):
        code = part.strip().upper()
        if code and code not in regions:
            regions.append(code)
    return regions or ["CIS", "RU", "SG", "ME", "PK"]


def _is_configured_for_freefire() -> bool:
    return bool(
        (HLGAMING_API_KEY and HLGAMING_USERUID)
        or FFDATA_API_KEY
        or GAME_VERIFY_URLS.get("freefire", "").strip()
    )


def _parse_nickname(payload: Any) -> str | None:
    if not isinstance(payload, dict):
        return None

    paths = [
        ("nickname",),
        ("username",),
        ("name",),
        ("player_name",),
        ("data", "nickname"),
        ("data", "username"),
        ("data", "name"),
        ("data", "basicInfo", "nickname"),
        ("data", "basic_info", "nickname"),
        ("basicInfo", "nickname"),
        ("basicinfo", "nickname"),
        ("result", "AccountName"),
        ("result", "nickname"),
        ("result", "username"),
        ("player", "nickname"),
        ("player", "name"),
    ]
    for path in paths:
        node: Any = payload
        for key in path:
            if not isinstance(node, dict):
                node = None
                break
            match = None
            for actual_key, value in node.items():
                if actual_key.lower() == key.lower():
                    match = value
                    break
            if match is None:
                node = None
                break
            node = match
        if isinstance(node, str) and node.strip():
            return node.strip()
    return None


def _override_lookup(game_id: str, player_id: str) -> dict | None:
    game_map = GAME_VERIFY_OVERRIDES.get(game_id, {})
    nickname = game_map.get(player_id)
    if nickname:
        return {"player_id": player_id, "nickname": nickname, "source": "override"}
    return None


async def _request_json(url: str, method: str = "GET", json_body: dict | None = None) -> Any:
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        if method.upper() == "POST":
            response = await client.post(url, json=json_body or {})
        else:
            response = await client.get(url)
        response.raise_for_status()
        return response.json()


async def _verify_via_custom_url(game_id: str, player_id: str) -> dict | None:
    template = GAME_VERIFY_URLS.get(game_id, "").strip()
    if not template:
        return None

    url = template.replace("{player_id}", player_id).replace("{uid}", player_id)
    if "{" in url:
        query = urlencode({"player_id": player_id, "uid": player_id, "game_id": game_id})
        url = url.split("?")[0] + "?" + query

    try:
        data = await _request_json(url)
    except (httpx.HTTPError, ValueError):
        return None

    nickname = _parse_nickname(data)
    if nickname:
        return {"player_id": player_id, "nickname": nickname, "source": "custom"}
    if isinstance(data, dict) and data.get("found") is False:
        return None
    return None


async def _verify_freefire_hlgaming(player_id: str, region: str) -> dict | None:
    if not HLGAMING_API_KEY or not HLGAMING_USERUID:
        return None

    body = {
        "sectionName": "freefireValidation",
        "useruid": HLGAMING_USERUID,
        "api": HLGAMING_API_KEY,
        "uid": player_id,
        "region": region,
    }
    url = "https://proapis.hlgamingofficial.com/main/games/freefire/validation/api"
    try:
        data = await _request_json(url, method="POST", json_body=body)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (401, 403):
            raise VerifyError(
                "Tekshiruv xizmati autentifikatsiyadan o'tmadi. HL Gaming kalitini tekshiring.",
                code="provider_auth",
            ) from exc
        return None
    except (httpx.HTTPError, ValueError):
        return None

    if isinstance(data, dict):
        result = data.get("result", {})
        if isinstance(result, dict):
            if result.get("valid") is False:
                return None
            nickname = result.get("AccountName") or _parse_nickname(data)
            if nickname:
                return {
                    "player_id": player_id,
                    "nickname": nickname,
                    "region": result.get("AccountRegion") or result.get("region") or region,
                    "source": "hlgaming",
                }

    nickname = _parse_nickname(data)
    if nickname:
        return {"player_id": player_id, "nickname": nickname, "region": region, "source": "hlgaming"}
    return None


async def _verify_freefire_ffdata(player_id: str) -> dict | None:
    if not FFDATA_API_KEY:
        return None

    url = f"{FFDATA_API_BASE}/api/v1/player/basic?uid={player_id}&region={FFDATA_REGION}"
    headers = {
        "Authorization": f"Bearer {FFDATA_API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 404:
                return None
            if response.status_code in (401, 403):
                raise VerifyError(
                    "FFData kaliti noto'g'ri yoki muddati tugagan.",
                    code="provider_auth",
                )
            if response.status_code == 400:
                return None
            response.raise_for_status()
            data = response.json()
    except VerifyError:
        raise
    except (httpx.HTTPError, ValueError):
        return None

    if isinstance(data, dict) and data.get("success") is False:
        return None

    nickname = _parse_nickname(data)
    if nickname:
        region = None
        if isinstance(data.get("data"), dict):
            region = data["data"].get("region")
        return {
            "player_id": player_id,
            "nickname": nickname,
            "region": region,
            "source": "ffdata",
        }
    return None


async def _verify_freefire_info_profile(player_id: str, region: str) -> dict | None:
    if not FREEFIRE_INFO_API_BASE:
        return None

    url = (
        f"{FREEFIRE_INFO_API_BASE}/api/v1/player-profile"
        f"?uid={player_id}&server={region}"
    )
    try:
        data = await _request_json(url)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            return None
        return None
    except (httpx.HTTPError, ValueError):
        return None

    nickname = _parse_nickname(data)
    if nickname:
        return {
            "player_id": player_id,
            "nickname": nickname,
            "region": region,
            "source": "freefireinfo",
        }
    return None


async def _verify_freefire_uid_info(player_id: str, region: str) -> dict | None:
    if not FREEFIRE_UID_INFO_API:
        return None

    url = f"{FREEFIRE_UID_INFO_API}/player-info?uid={player_id}&region={region}"
    try:
        data = await _request_json(url)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (404, 500):
            return None
        return None
    except (httpx.HTTPError, ValueError):
        return None

    if isinstance(data, dict) and data.get("error"):
        return None

    nickname = _parse_nickname(data)
    if nickname:
        return {
            "player_id": player_id,
            "nickname": nickname,
            "region": region,
            "source": "uid_info",
        }
    return None


async def _verify_freefire(player_id: str, region: str | None) -> dict | None:
    regions = _region_candidates(region)

    custom = await _verify_via_custom_url("freefire", player_id)
    if custom:
        return custom

    for ff_region in regions:
        try:
            hlg = await _verify_freefire_hlgaming(player_id, ff_region)
        except VerifyError:
            raise
        if hlg:
            return hlg

    for ff_region in regions:
        info = await _verify_freefire_info_profile(player_id, ff_region)
        if info:
            return info
        uid_info = await _verify_freefire_uid_info(player_id, ff_region)
        if uid_info:
            return uid_info

    try:
        ffdata = await _verify_freefire_ffdata(player_id)
    except VerifyError:
        raise
    if ffdata:
        return ffdata

    return None


async def verify_player(game_id: str, player_id: str, region: str | None = None) -> dict:
    game_id = game_id.lower().strip()
    player_id = player_id.strip()

    if game_id not in SUPPORTED_GAMES:
        raise VerifyError("Bu o'yin uchun tekshiruv mavjud emas", code="unsupported")

    if not player_id.isdigit() or not (5 <= len(player_id) <= 15):
        raise VerifyError("Noto'g'ri o'yinchi ID formati", code="invalid_id")

    override = _override_lookup(game_id, player_id)
    if override:
        return override

    if game_id != "freefire":
        custom = await _verify_via_custom_url(game_id, player_id)
        if custom:
            return custom
        raise VerifyError(
            "O'yinchi topilmadi. ID yoki region noto'g'ri bo'lishi mumkin.",
            code="not_found",
        )

    if not _is_configured_for_freefire():
        raise VerifyError(
            "Tekshiruv xizmati sozlanmagan. HL Gaming yoki donat provider kalitini Render'ga qo'shing.",
            code="not_configured",
        )

    try:
        ff = await _verify_freefire(player_id, region)
    except VerifyError:
        raise
    if ff:
        return ff

    raise VerifyError(
        "O'yinchi topilmadi. ID yoki region noto'g'ri bo'lishi mumkin.",
        code="not_found",
    )
