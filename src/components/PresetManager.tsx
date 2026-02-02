import { useState } from 'react';
import { Save, Trash2, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Preset } from '@/hooks/useSliderState';

interface PresetManagerProps {
  presets: Preset[];
  currentMode: 'timelapse1' | 'timelapse2' | 'move1';
  onSavePreset: (name: string) => void;
  onLoadPreset: (presetId: string) => void;
  onDeletePreset: (presetId: string) => void;
}

export function PresetManager({
  presets,
  currentMode,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}: PresetManagerProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const modePresets = presets.filter((p) => p.mode === currentMode);

  const handleSave = () => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim());
      setPresetName('');
      setSaveDialogOpen(false);
    }
  };

  const handleLoad = (presetId: string) => {
    onLoadPreset(presetId);
    setLoadDialogOpen(false);
  };

  return (
    <div className="flex gap-2">
      {/* Save Preset */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card border-border max-w-xs">
          <DialogHeader>
            <DialogTitle>Save Preset</DialogTitle>
            <DialogDescription>
              Save current configuration as a preset
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="bg-secondary border-border"
            />
            <Button onClick={handleSave} className="w-full">
              Save Preset
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Preset */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Load
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Load Preset</DialogTitle>
            <DialogDescription>
              Load a saved configuration for this mode
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2 max-h-64 overflow-y-auto">
            {modePresets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No presets saved for this mode
              </p>
            ) : (
              modePresets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-3 rounded-md bg-secondary/50 border border-border hover:bg-secondary transition-colors"
                >
                  <button
                    onClick={() => handleLoad(preset.id)}
                    className="flex-1 text-left"
                  >
                    <div className="font-medium text-sm">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">
                      A: {preset.config.pointA} → B: {preset.config.pointB}
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeletePreset(preset.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
