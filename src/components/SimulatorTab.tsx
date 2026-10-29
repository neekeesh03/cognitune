import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { FORCE } from "@/engine/forces";
import { Inputs, VAR_KEYS, simulateBlock, DEFAULT_THRESHOLDS } from "@/engine/model";

export function SimulatorTab() {
  const [v, setV] = useState<Inputs>({ Primode: 0.8, CAP: 0.6, Flexion: 0.7, Anchory: 0.7, Grain: 0.4, Slip: 0.3 });
  const pts = simulateBlock(v, 90);
  const startsReady = pts[0].drive > DEFAULT_THRESHOLDS.ready;
  const first = startsReady ? pts.find(p => p.drive <= DEFAULT_THRESHOLDS.ready) : undefined;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <Card className="glass border-0 rounded-3xl"><CardHeader><CardTitle>Scenario</CardTitle></CardHeader>
        <CardContent className="space-y-4">{VAR_KEYS.map(k => (
          <div key={k}><div className="flex justify-between text-sm"><span>{FORCE[k].title}</span><span className="tabular-nums">{v[k].toFixed(2)}</span></div>
            <Slider min={0} max={1} step={0.05} value={[v[k]]} onValueChange={([x]) => setV({ ...v, [k]: x })} /></div>))}
          <p className="text-xs text-muted-foreground">Try setting "Getting started" to zero and "Why it matters" to full. Caring a lot does not help if starting is blocked.</p>
        </CardContent></Card>
      <Card className="glass border-0 rounded-3xl"><CardHeader><CardTitle>How your energy may change in 90 minutes</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer><LineChart data={pts}><XAxis dataKey="t" type="number" domain={[0, 90]} ticks={[0, 15, 30, 45, 60, 75, 90]} unit="m" /><YAxis domain={[0, (m: number) => Math.max(1.2, Math.ceil(m * 10) / 10)]} /><Tooltip formatter={(x: number) => x.toFixed(2)} />
            <ReferenceLine y={DEFAULT_THRESHOLDS.ready} strokeDasharray="4 4" /><Line dataKey="drive" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
          <p className="mt-2 text-sm text-muted-foreground">{!startsReady ? "You start below the ready line in this scenario." : first ? `Drive falls below the ready line around minute ${first.t}. Plan a reset before then.` : "Drive stays above the ready line for the whole block."} A rough guide that assumes focus fades faster when your mind wanders and tasks feel heavier as you tire. It is not a measurement.</p>
        </CardContent></Card>
    </div>
  );
}
