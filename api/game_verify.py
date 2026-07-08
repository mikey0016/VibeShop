"""O'yinchi ID tekshiruv — tashqi provider yoki env override."""

from __future__ import annotations

import json
import os
from typing import Any
from urllib.parse import urlencode

import httpx

from config import (
    FFDATA_API_BASE,
    FFDATA_API_KEY,
    GAME_VERIFY_OVERRIDES,
    GAME_VERIFY_URLS,
    FREEFIRE_REGION,
    HLGAMING_API_KEY,
    HLGAMING_USERUID,
)

SUPPORTED_GAMES = frozenset(
    {"freefire", "pubg", "bloodstrike", "magicchess", "deltaforce", "shootloot", "standoff2"}
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
        ("result", "AccountName"),
        ("result", "nickname"),
        ("result", "username"),
        ("player", "nickname"),
        ("player", "name"),
    ]
    for path in paths:
        node: Any = payload
        for key in path:
            if not isinstance(node, dict) or key not in node:
                node = None
                break
            node = node[key]
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
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
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


async def _verify_freefire_hlgaming(player_id: str) -> dict | None:
    if not HLGAMING_API_KEY or not HLGAMING_USERUID:
        return None

    body = {
        "sectionName": "freefireValidation",
        "useruid": HLGAMING_USERUID,
        "api": HLGAMING_API_KEY,
        "uid": player_id,
        "region": FREEFIRE_REGION,
    }
    url = "https://proapis.hlgamingofficial.com/main/games/freefire/validation/api"
    try:
        data = await _request_json(url, method="POST", json_body=body)
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
                    "region": result.get("AccountRegion") or result.get("region"),
                    "source": "hlgaming",
                }

    nickname = _parse_nickname(data)
    if nickname:
        return {"player_id": player_id, "nickname": nickname, "source": "hlgaming"}
    return None


async def _verify_freefire_ffdata(player_id: str) -> dict | None:
    if not FFDATA_API_KEY:
        return None

    url = f"{FFDATA_API_BASE}/api/v1/player/basic?uid={player_id}"
    headers = {
        "Authorization": f"Bearer {FFDATA_API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 404:
                return None
            response.raise_for_status()
            data = response.json()
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


async def verify_player(game_id: str, player_id: str) -> dict:
    game_id = game_id.lower().strip()
    player_id = player_id.strip()

    if game_id not in SUPPORTED_GAMES:
        raise ValueError("Bu o'yin uchun tekshiruv mavjud emas")

    if not player_id.isdigit() or not (5 <= len(player_id) <= 15):
        raise ValueError("Noto'g'ri o'yinchi ID formati")

    override = _override_lookup(game_id, player_id)
    if override:
        return override

    custom = await _verify_via_custom_url(game_id, player_id)
    if custom:
        return custom

    if game_id == "freefire":
        ff = await _verify_freefire_ffdata(player_id)
        if ff:
            return ff
        hlg = await _verify_freefire_hlgaming(player_id)
        if hlg:
            return hlg

    raise ValueError(
        "O'yinchi topilmadi. ID yoki region noto'g'ri bo'lishi mumkin."
    )
