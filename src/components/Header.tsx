import { Settings, Bluetooth, BluetoothConnected, BluetoothOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  onConnect: () => void;
  onSettingsClick: () => void;
}

export function Header({
  isConnected,
  isConnecting,
  deviceName,
  onConnect,
  onSettingsClick,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
          <span className="text-primary font-bold text-sm">CS</span>
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Camera Slider</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <BluetoothConnected className="w-4 h-4 text-success" />
              <span className="text-sm text-success">{deviceName}</span>
            </>
          ) : isConnecting ? (
            <>
              <Bluetooth className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">Connecting...</span>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onConnect}
              className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <BluetoothOff className="w-4 h-4" />
              Connect
            </Button>
          )}
        </div>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
