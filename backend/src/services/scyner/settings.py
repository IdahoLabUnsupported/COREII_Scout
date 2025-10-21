# © 2025 Idaho National Laboratory. All rights reserved.
from pydantic_settings import BaseSettings
import argparse
from pip._vendor import tomli
from typing import Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

with open("config.toml", "rb") as f:
    data = tomli.load(f)


class Settings(BaseSettings):
    # Base Settings
    app_name: str = data["app"]["app_name"]
    app_description: str = data["app"]["description"]
    origins: list[str] = data["app"]["origins"]
    default_responses: dict[int, dict[str, str]] = {404: {"description": "Not found"}}
    microservice_version: str = data["app"]["microservice_version"]

    # SSL
    ssl_passphrase_env_var: str = data["app"]["ssl"]["ssl_env_var"]
    ssl_passphrase: str = ""
    #if ssl_passphrase_env_var not in os.environ:
        #logger.warning(f"{ssl_passphrase_env_var} environment variable must be defined to read the SSL cert.")
    #else:
        #ssl_passphrase = os.environ[ssl_passphrase_env_var]
    ssl_keyfile: str = data["app"]["ssl"]["ssl_keyfile"]
    ssl_certfile: str = data["app"]["ssl"]["ssl_certfile"]

    # API Keys
    api_key_file: str = data["app"]["security"]["api_key_file"]
    api_keys: dict[str, Any] = {}


settings = Settings()


def arg_parse() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="RESTful API server.")
    parser.add_argument(
        "-p",
        "--port",
        type=int,
        required=True,
        help="Specify the port to run the API on.",
    )
    parser.add_argument(
        "--host",
        type=str,
        required=False,
        default="localhost",
        help="Specify the host to run the API on.",
    )
    parser.add_argument(
        "--ssl",
        action="store_true",
        required=False,
        default=False,
        help="Enable SSL.",
    )

    return parser
