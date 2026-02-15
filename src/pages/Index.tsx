import {useEffect, useState} from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { PositionMode } from '@/components/modes/PositionMode';
import { Timelapse1Mode } from '@/components/modes/Timelapse1Mode';
import { Timelapse2Mode } from '@/components/modes/Timelapse2Mode';
import { VelocityMode } from '@/components/modes/VelocityMode';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import {useSliderStore, ActiveMode, autoConnect, setActiveMode} from '@/store/sliderStore';

const Index = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    autoConnect();
  }, []);

  const error  = useSliderStore(s => s.error);
  const activeMode  = useSliderStore(s => s.activeMode);

  return (
    <div className="min-h-screen bg-background technical-grid">
      <Header onSettingsClick={() => setSettingsOpen(true)} />

      <main className="container max-w-lg mx-auto px-4 py-4">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {error}
          </div>
        )}

        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as ActiveMode)}>
          <TabsList className="grid w-full grid-cols-4 bg-secondary mb-4">
            <TabsTrigger value="goto" className="flex-1 text-xs">
              Goto
            </TabsTrigger>
            <TabsTrigger value="timelapse1" className="flex-1 text-xs">
              TL1
            </TabsTrigger>
            <TabsTrigger value="timelapse2" className="flex-1 text-xs">
              TL2
            </TabsTrigger>
            <TabsTrigger value="velocity" className="flex-1 text-xs">
              Velocity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="goto" className="mt-0">
            <PositionMode />
          </TabsContent>

          <TabsContent value="timelapse1" className="mt-0">
            <Timelapse1Mode />
          </TabsContent>

          <TabsContent value="timelapse2" className="mt-0">
            <Timelapse2Mode />
          </TabsContent>

          <TabsContent value="velocity" className="mt-0">
            <VelocityMode />
          </TabsContent>
        </Tabs>
      </main>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Index;
