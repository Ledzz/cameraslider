# BLE Control API

This document is the frontend integration reference for controlling the slider over BLE.

## Overview

- Transport: BLE GATT
- Device name: `Camera Slider`
- Service UUID: `12345678-1234-5678-1234-56789abcdef0`
- Command characteristic (write): `12345678-1234-5678-1234-56789abcdef1`
- Position/status characteristic (read + notify): `12345678-1234-5678-1234-56789abcdef2`
- Response characteristic (read + notify): `12345678-1234-5678-1234-56789abcdef3`

## Frontend Connection Flow

1. Scan for device advertising service `12345678-1234-5678-1234-56789abcdef0`.
2. Connect.
3. Discover service and the 3 characteristics.
4. Enable notifications on:
   - position/status characteristic
   - response characteristic
5. Keep command characteristic for writes.

Recommended app behavior:

- Send `{"cmd":"ping","requestId":"<id>"}` after connect.
- Wait for response ack (`reason:"pong"`) before showing the device as fully ready.
- Treat `sessionId` as connection generation; if it changes, reset app-side transient state.

## Command JSON Contract

All commands are JSON objects written to command characteristic.

Base shape:

```json
{
  "cmd": "...",
  "requestId": "optional-correlation-id"
}
```

- `requestId` is optional, but strongly recommended.
- If provided, it is echoed in response notifications.

## Supported Commands

### 1) Ping

Request:

```json
{ "cmd": "ping", "requestId": "r1" }
```

Response `reason` will be `pong`.

### 2) Mode Control

Request:

```json
{ "cmd": "mode", "mode": "idle|free|goto|timelapse1|timelapse2|move1|calibrating" }
```

#### `goto`

```json
{ "cmd": "mode", "mode": "goto", "target": 12000, "maxVel": 8000 }
```

- `target` required
- `maxVel` optional (per-command override)

#### `timelapse1`

```json
{ "cmd": "mode", "mode": "timelapse1", "start": 0, "end": 50000, "vel": 6000 }
```

- `start`, `end` required
- `vel` optional, updates `timelapse1Vel`

#### `timelapse2`

```json
{
  "cmd": "mode",
  "mode": "timelapse2",
  "start": 0,
  "end": 50000,
  "stepCount": 100,
  "stepIntervalMs": 80,
  "delay": 20,
  "vel": 3000
}
```

- Required: `start`, `end`, `stepCount`, `stepIntervalMs`
- Optional:
  - `delay` (ms): wait after trigger before moving one step (default 20)
  - `vel`: updates `timelapse2Vel`

Timelapse2 trigger behavior:

1. Detect AUX2 falling edge trigger.
2. Enforce min trigger spacing (`stepIntervalMs`, and internal debounce).
3. Wait `delay` ms.
4. Move exactly one planned step.

#### `move1`

```json
{ "cmd": "mode", "mode": "move1", "vel": 7000 }
```

- `vel` optional; if omitted, uses current `move1Vel`.

#### `calibrating`

```json
{ "cmd": "mode", "mode": "calibrating" }
```

- Starts homing/calibration flow.

### 3) Direct Velocity

```json
{ "cmd": "velocity", "vel": 1500 }
```

- Sets mode to `free` and applies speed.

### 4) Acceleration Shortcut

```json
{ "cmd": "acc", "acc": 200000 }
```

### 5) Driver Enable/Disable

```json
{ "cmd": "driver", "enable": true }
{ "cmd": "driver", "enable": false }
```

- Missing `enable` returns error `missing_driver_enable`.

### 6) Stop

```json
{ "cmd": "stop" }
```

- Forces mode to `idle`.

### 7) Settings Update

Use `cmd: "settings"` when sending pure configuration payloads.

Note: legacy compatibility keys are removed. Use only the keys documented here.

```json
{
  "cmd": "settings",
  "currentLimit": 80,
  "microsteps": 16,
  "pdVoltage": 12,
  "standstillMode": 1,
  "maxSpeed": 25000,
  "acceleration": 180000,
  "homingSpeed": 9000,
  "gotoMaxVel": 8000,
  "timelapse1Vel": 6000,
  "timelapse2Vel": 3000,
  "move1Vel": 7000,
  "timelapse2DelayMs": 20
}
```

## Valid Ranges / Values

- `microsteps`: one of `1,2,4,8,16,32,64,128,256`
- `currentLimit`: `0..100`
- `pdVoltage`: one of `5,12,15,20`
- `standstillMode`: `0..3`
  - `0 NORMAL`
  - `1 FREEWHEELING`
  - `2 STRONG_BRAKING`
  - `3 BRAKING`
- `maxSpeed`: `> 0`
- `acceleration`: `>= 0`
- `homingSpeed`: `> 0`
- `timelapse2DelayMs`: `>= 0`

## Response Characteristic (ACK/NAK)

Each processed command sends a response JSON on response characteristic.

Example success:

```json
{
  "ok": true,
  "cmd": "mode",
  "reason": "ok",
  "requestId": "r42",
  "sessionId": 7,
  "fw": "0.1.0",
  "mode": "timelapse2",
  "error": ""
}
```

Example error:

```json
{
  "ok": false,
  "cmd": "mode",
  "reason": "missing_target",
  "requestId": "r43",
  "sessionId": 7,
  "fw": "0.1.0",
  "mode": "idle",
  "error": "missing_target"
}
```

## Position/Status Characteristic

Status is published periodically via notify.

Common fields:

- Runtime/control:
  - `mode`, `error`, `target`, `velocityCmd`
  - `sessionId`, `fw`
- Position/calibration:
  - `position`, `leftPoint`, `rightPoint`, `homed`
- Driver/config:
  - `driverEnabled`, `microsteps`, `currentLimit`, `pdVoltage`, `standstillMode`
  - `maxSpeed`, `acceleration`, `homingSpeed`, `gotoMaxVel`
  - `timelapse1Vel`, `timelapse2Vel`, `move1Vel`
  - `stepCount`, `stepsExecuted`, `timelapse2DelayMs`
- Diagnostics:
  - `aux2`, `controlSign`, `encoderRejected`, `encoderReadErrors`

## Error Codes You Should Handle

- `bad_json`
- `missing_cmd`
- `unknown_cmd`
- `invalid_mode`
- `missing_target`
- `missing_tl1_params`
- `missing_tl2_params`
- `invalid_step_count`
- `missing_driver_enable`
- `invalid_microsteps`
- `invalid_pd_voltage`
- `invalid_standstill_mode`
- `invalid_max_speed`
- `invalid_homing_speed`
- `not_homed`
- `step_timeout`
- `invalid_endpoints`

## Frontend Reliability Recommendations

- Always send `requestId`; match responses by `requestId`.
- Treat command as accepted only on response `ok: true`.
- Use a client-side command timeout (e.g. 1-2s) for missing ACK.
- On reconnect (or changed `sessionId`), clear pending command map and refresh UI from latest status notification.
- Keep last known status snapshot in app state for smooth UI recovery.
