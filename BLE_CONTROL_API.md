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
- Wait for response ack (`r:"pong"`) before showing the device as fully ready.
- Treat `sid` as connection generation; if it changes, reset app-side transient state.

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
{ "cmd": "mode", "mode": "idle|velocity|goto|timelapse1|timelapse2|calibrating" }
```

#### `goto`

```json
{ "cmd": "mode", "mode": "goto", "target": 12000, "maxVel": 8000 }
```

- `target` required
- `maxVel` optional (per-command override)

#### `timelapse1`

```json
{
  "cmd": "mode",
  "mode": "timelapse1",
  "start": 0,
  "end": 50000,
  "totalTimeMs": 120000,
  "pingpong": true,
  "gimbalA": { "yaw": 0.0, "roll": 0.0, "pitch": 0.0, "focus": 0 },
  "gimbalB": { "yaw": 45.0, "roll": 0.0, "pitch": -10.0, "focus": 500 }
}
```

- Required: `start`, `end`, `totalTimeMs`
- Optional: `pingpong` (`true`/`false`, default `false`)
- Optional: `gimbalA`, `gimbalB`
- If one gimbal endpoint is provided, both are required.
- Gimbal endpoint fields:
  - `yaw`: `-180..180`
  - `roll`: `-30..30`
  - `pitch`: `-30..30`
  - `focus`: `0..1000`
- Behavior:
  1. Move to `start` (A) using max speed profile.
  2. Compute required A->B speed from distance and `totalTimeMs`.
     (`totalTimeMs` applies to A->B leg only, not move-to-A.)
  3. Run constant-speed A->B motion until endpoint B is reached.
  4. If `pingpong=true`, swap A/B and continue indefinitely until `stop`.
  5. If `gimbalA/gimbalB` are provided, the firmware interpolates yaw/roll/pitch/focus across slider travel.

#### `timelapse2`

```json
{
  "cmd": "mode",
  "mode": "timelapse2",
  "start": 0,
  "end": 50000,
  "stepCount": 100,
  "delay": 20
}
```

- Required: `start`, `end`, `stepCount`
- Optional:
  - `delay` (ms): wait after trigger before moving one step (default 20)
  - `gimbalA`, `gimbalB`: optional gimbal endpoints with the same shape as `timelapse1`

TL2 constants are configured in firmware code:

- step velocity is fixed
- step interval is fixed

Timelapse2 trigger behavior:

1. Move to `start` (A) using max speed profile.
2. Detect AUX2 falling edge trigger.
3. Enforce min trigger spacing (firmware step interval + internal debounce).
4. Wait `delay` ms.
5. Move exactly one planned step (`(B-A)/stepCount`, with remainder distribution).
6. If `gimbalA/gimbalB` are provided, the firmware interpolates yaw/roll/pitch/focus across step progress.

#### `calibrating`

```json
{ "cmd": "mode", "mode": "calibrating" }
```

- Starts homing/calibration flow.

### 3) Direct Velocity

```json
{ "cmd": "velocity", "vel": 1500 }
```

- Sets mode to `velocity` and applies speed.
- Velocity mode auto-bounce behavior:
  - If homed: reverses at calibrated endpoint bounds.
  - If not homed: reverses on AUX1 end-switch activation edge.

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
  "timelapse1TotalTimeMs": 120000,
  "timelapse1PingPong": true,
  "timelapse2DelayMs": 20
}
```

### 8) Gimbal Bridge

Use `cmd: "gimbal"` for BLE gimbal relay commands.

#### Connect / Disconnect

```json
{ "cmd": "gimbal", "action": "connect", "requestId": "rr1" }
{ "cmd": "gimbal", "action": "disconnect", "requestId": "rr2" }
```

#### Basic Actions

```json
{ "cmd": "gimbal", "action": "recenter", "requestId": "rr3" }
{ "cmd": "gimbal", "action": "sleep", "requestId": "rr4" }
{ "cmd": "gimbal", "action": "wake", "requestId": "rr5" }
{ "cmd": "gimbal", "action": "shutter", "requestId": "rr6" }
```

#### Angle Control

```json
{
  "cmd": "gimbal",
  "action": "angle",
  "yaw": 10.0,
  "roll": 0.0,
  "pitch": -5.0,
  "requestId": "rr7"
}
```

- Sends gimbal absolute-angle control.
- Units are degrees.

#### Focus Estimated Position

```json
{ "cmd": "gimbal", "action": "focus", "target": 650, "requestId": "rr8" }
{ "cmd": "gimbal", "action": "focusZero", "requestId": "rr9" }
```

- `target` range: `0..1000`
- This is estimated position only, maintained by the ESP32.
- `focusZero` resets the estimate to `0` without reading real lens position.

Gimbal action errors you should handle:

- `missing_gimbal_action`
- `invalid_gimbal_action`
- `missing_gimbal_angle`
- `missing_gimbal_focus_target`
- `invalid_gimbal_focus_target`
- `gimbal_busy`

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
- `totalTimeMs` in `timelapse1` mode: `> 0`
- `timelapse1PingPong`: `true|false`

Current compact periodic status does not expose firmware limit fields like `mxl` or `al`.

## Response Characteristic (ACK/NAK)

Each processed command sends a response JSON on response characteristic.

Short-key schema:

- `ok`: success flag
- `c`: command name
- `r`: reason/result code
- `rid`: request id echo (if sent)
- `sid`: session id
- `fw`: firmware version
- `m`: current mode
- `e`: current error string

Example success:

```json
{
  "ok": true,
  "c": "mode",
  "r": "ok",
  "rid": "r42",
  "sid": 7,
  "fw": "0.1.0",
  "m": "timelapse2",
  "e": ""
}
```

Example error:

```json
{
  "ok": false,
  "c": "mode",
  "r": "missing_target",
  "rid": "r43",
  "sid": 7,
  "fw": "0.1.0",
  "m": "idle",
  "e": "missing_target"
}
```

## Position/Status Characteristic

Status is published periodically via notify.

Short-key schema:

- Periodic status keys:
  - `m` mode
  - `h` homed flag
  - `p` current position
  - `t` target position
  - `v` commanded velocity
  - `e` error
  - `se` steps executed
  - `lp` left point
  - `rp` right point
  - `sid` session id
  - `fw` firmware version
- Periodic status is intentionally compact and does not include gimbal telemetry.
- Current periodic status keys are:
  - `m`, `h`, `p`, `t`, `v`, `e`, `se`, `lp`, `rp`, `sid`, `fw`
- Gimbal telemetry is delivered on the response characteristic instead:
  - command ACKs for `cmd:"gimbal"` include nested `gm`
  - unsolicited bridge updates use `{"evt":"gimbal","sid":...,"gm":{...}}`
  - `gm.c` connected
  - `gm.g` connecting
  - `gm.s` sleeping
  - `gm.fk` focus initialized
  - `gm.fp` focus estimated position `0..1000`
  - `gm.b` battery percent when known
  - `gm.y` yaw in degrees when known
  - `gm.r` roll in degrees when known
  - `gm.p2` pitch in degrees when known
  - `gm.ek` error present
  - `gm.e` error string

Notes:

- `t1v` is computed by firmware for each timelapse1 run from distance and `t1tm`.
- `t2v` and `t2i` are firmware constants.

## Error Codes You Should Handle

- `bad_json`
- `missing_cmd`
- `unknown_cmd`
- `invalid_mode`
- `missing_target`
- `missing_tl1_params`
- `missing_tl2_params`
- `incomplete_gimbal_endpoints`
- `invalid_gimbal_mode`
- `invalid_gimbal_pose`
- `invalid_step_count`
- `invalid_tl1_time`
- `tl1_speed_too_high`
- `missing_driver_enable`
- `invalid_microsteps`
- `invalid_pd_voltage`
- `invalid_standstill_mode`
- `invalid_max_speed`
- `invalid_homing_speed`
- `not_homed`
- `step_timeout`
- `invalid_endpoints`
- `missing_gimbal_action`
- `invalid_gimbal_action`
- `missing_gimbal_angle`
- `missing_gimbal_focus_target`
- `invalid_gimbal_focus_target`
- `gimbal_busy`

## Migration (v1 -> v2 Short Keys)

Command payloads are unchanged (keep verbose keys like `pdVoltage`, `timelapse1TotalTimeMs`, etc.).
Only outbound response/status payload keys changed to shorter names.

Timelapse1 update: `mode: timelapse1` now requires `totalTimeMs`.
Move1 update: `mode: move1` is removed; use `timelapse1` with `pingpong: true`.
Timelapse2 update: `stepIntervalMs` and `vel` are no longer accepted in command payloads (firmware constants).

### Response key mapping

- `cmd` -> `c`
- `reason` -> `r`
- `requestId` -> `rid`
- `sessionId` -> `sid`
- `mode` -> `m`
- `error` -> `e`

### Status key mapping

- `mode` -> `m`
- `position` -> `p`
- `target` -> `t`
- `velocityCmd` -> `v`
- `leftPoint` -> `lp`
- `rightPoint` -> `rp`
- `homed` -> `h`
- `error` -> `e`
- `stepsExecuted` -> `se`
- `sessionId` -> `sid`
- `firmwareVersion` -> `fw`

### Gimbal response/event mapping

- `cmd: "ronin"` -> `cmd: "gimbal"`
- `rn` -> `gm`
- `evt: "ronin"` -> `evt: "gimbal"`

### Removed from periodic status

- `gotoRemaining`
- `gotoPlannedVel`
- `controlSign`
- `encoderRejected`
- `encoderReadErrors`

### Frontend migration checklist

1. Update status parser to accept short keys.
2. Update response parser to use `c/r/rid/sid/m/e`.
3. Keep command payloads unchanged.
4. Use `rid` for command correlation and `sid` for reconnect/session resets.

## Frontend Reliability Recommendations

- Always send `requestId`; match responses by `requestId`.
- Treat command as accepted only on response `ok: true`.
- Use a client-side command timeout (e.g. 1-2s) for missing ACK.
- On reconnect (or changed `sessionId`), clear pending command map and refresh UI from latest status notification.
- Keep last known status snapshot in app state for smooth UI recovery.
