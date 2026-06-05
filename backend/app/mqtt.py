import asyncio
import json
import logging
from contextlib import asynccontextmanager

import aiomqtt

from .config import settings

logger = logging.getLogger(__name__)

_client: aiomqtt.Client | None = None


async def get_mqtt_client() -> aiomqtt.Client | None:
    return _client


async def publish(topic: str, payload: dict) -> None:
    if _client is None:
        return
    try:
        await _client.publish(topic, json.dumps(payload), qos=1)
    except Exception as exc:
        logger.warning("MQTT publish failed: %s", exc)


async def mqtt_loop() -> None:
    global _client
    while True:
        try:
            async with aiomqtt.Client(settings.mqtt_host, settings.mqtt_port) as client:
                _client = client
                logger.info("MQTT connected to %s:%d", settings.mqtt_host, settings.mqtt_port)
                async for message in client.messages:
                    logger.debug("MQTT rx: %s → %s", message.topic, message.payload)
        except Exception as exc:
            _client = None
            logger.warning("MQTT disconnected: %s — retry in 5 s", exc)
            await asyncio.sleep(5)
