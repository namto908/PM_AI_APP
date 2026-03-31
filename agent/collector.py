"""
TaskOps AI — Server Metrics Collector Agent
Run on each monitored server with: python collector.py

Install dependencies: pip install psutil httpx pyyaml
"""
import os
import sys
import time
import yaml
import psutil
import httpx


def load_config() -> dict:
    config_path = os.path.join(os.path.dirname(__file__), "config.yaml")
    with open(config_path) as f:
        return yaml.safe_load(f)


def collect(config: dict) -> dict:
    cpu = psutil.cpu_percent(interval=1)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    load = psutil.getloadavg()

    net_in = 0
    net_out = 0
    if config.get("collect_network", True):
        net1 = psutil.net_io_counters()
        time.sleep(1)
        net2 = psutil.net_io_counters()
        net_in = max(0, int((net2.bytes_recv - net1.bytes_recv) * 8 / 1024))  # Kbps
        net_out = max(0, int((net2.bytes_sent - net1.bytes_sent) * 8 / 1024))

    return {
        "cpu_percent": cpu,
        "ram_percent": mem.percent,
        "ram_used_mb": mem.used // 1024 // 1024,
        "ram_total_mb": mem.total // 1024 // 1024,
        "disk_percent": disk.percent,
        "load_1m": round(load[0], 3),
        "load_5m": round(load[1], 3),
        "load_15m": round(load[2], 3),
        "net_in_kbps": net_in,
        "net_out_kbps": net_out,
    }


def push(config: dict, metrics: dict) -> None:
    api_url = config["api_url"].rstrip("/")
    endpoint = f"{api_url}/api/v1/ops/metrics/ingest"
    httpx.post(
        endpoint,
        json=metrics,
        headers={"X-Agent-Token": config["agent_token"]},
        timeout=15,
    ).raise_for_status()


def main() -> None:
    config = load_config()
    interval = config.get("interval_seconds", 60)
    print(f"TaskOps agent started. Pushing metrics every {interval}s to {config['api_url']}", flush=True)

    while True:
        try:
            metrics = collect(config)
            push(config, metrics)
            print(f"Pushed: cpu={metrics['cpu_percent']}% ram={metrics['ram_percent']}%", flush=True)
        except httpx.HTTPStatusError as e:
            print(f"HTTP error: {e.response.status_code} — {e.response.text}", file=sys.stderr, flush=True)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr, flush=True)
        time.sleep(interval)


if __name__ == "__main__":
    main()
