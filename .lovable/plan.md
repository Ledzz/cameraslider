

## Camera Slider Control App

A dark-themed, technical web UI for controlling your DIY camera slider via Bluetooth Low Energy.

---

### Core Layout

**Tab-based navigation** with the following structure:
- **Control tabs**: Timelapse 1 | Timelapse 2 | Move 1
- **Settings icon** in the header for quick access to settings pages
- **Connection status** always visible in the header with "Connect" button when disconnected

---

### Mode: Timelapse 1 (Slow Pan)
*Smoothly move camera from Point A to Point B over duration T*

- **Point A/B inputs**: Numeric input OR "Set from current position" button
- **Duration (T)**: Time picker for hours:minutes:seconds
- **Position visualization**: Horizontal slider showing current position with A/B markers
- **Free toggle**: Enable manual positioning of the slider
- **Start/Stop controls**

---

### Mode: Timelapse 2 (Step-by-Step)
*Move from Point A to Point B in discrete steps*

- **Point A/B inputs**: Same as Timelapse 1
- **Steps (S)**: Number input for total steps
- **Position visualization**: Shows current position + step markers
- **Free toggle**: Enable manual positioning
- **"Next Step" button**: Manually trigger next step from the app
- **Status indicator**: Shows which step you're on (e.g., "Step 5 of 20")
- **Start/Stop controls**

---

### Mode: Move 1 (Periodic)
*Continuously move back and forth between A and B*

- **Point A/B inputs**: Same as other modes
- **Cycle time (T)**: Duration for one complete A→B→A cycle
- **Position visualization**: Animated position indicator
- **Free toggle**: Enable manual positioning
- **Start/Stop controls**

---

### Settings Menu

**Calibration Page:**
- Input fields for manual stall values
- "Auto Calibration" button to launch calibration procedure
- Status display showing calibration progress

**Motor Settings Page:**
- Stall sensitivity values
- Operating voltage
- Power percentage slider (0-100%)
- Save button to apply settings

---

### BLE Connection

- **Connect button** shown prominently when no device is connected
- **Automatic reconnection** to last known device on app load
- **Device name/status** shown when connected
- **Disconnect option** in settings
- **JSON-based commands** sent to slider
- **Position notifications** received and displayed in real-time

---

### Preset System

- **Save current configuration** button in each mode
- **Preset list** accessible from each mode tab
- **Quick-load presets** with one tap
- Presets stored locally in browser

