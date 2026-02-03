import { Settings, Bluetooth, BluetoothConnected, BluetoothSearching } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSliderStore } from '@/store/sliderStore';

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  const { connection, connect } = useSliderStore();

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur border-b border-border">
      <div className="container max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">CS</span>
          </div>
          <span className="font-semibold text-sm">Camera Slider</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection Status */}
          {connection.isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs">
              <BluetoothConnected className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{connection.deviceName}</span>
            </div>
          ) : connection.isConnecting ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-xs">
              <BluetoothSearching className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">Connecting...</span>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={connect}
              className="gap-2 text-xs h-8"
            >
              <Bluetooth className="w-3.5 h-3.5" />
              Connect
            </Button>
          )}

          {/* Settings Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="h-8 w-8"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
