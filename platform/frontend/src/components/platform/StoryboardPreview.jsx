import { usePlatformI18n } from './platformText';

export default function StoryboardPreview({ storyboard }) {
  const { t } = usePlatformI18n();
  const scenes = storyboard?.scenes || [];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
      <div className="mb-3 text-xl font-semibold">{t.storyboard}</div>
      {!scenes.length ? (
        <div className="text-white/60">{t.noStoryboard}</div>
      ) : (
        <div className="grid gap-3">
          {scenes.map((scene) => (
            <div key={scene.scene_index} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <div className="mb-2 flex flex-wrap gap-3 text-white/80">
                <span>{t.scene} {scene.scene_index + 1}</span>
                <span>{t.duration}：{scene.duration ?? '-'}s</span>
                <span>{t.panels}：{(scene.panel_ids || []).join(', ') || '-'}</span>
              </div>
              <div className="space-y-2 text-white/70">
                <div><span className="text-white/90">{t.subtitle}：</span>{scene.subtitle_text || '-'}</div>
                <div><span className="text-white/90">{t.narration}：</span>{scene.narration_text || '-'}</div>
                <div><span className="text-white/90">{t.prompt}：</span>{scene.video_prompt || '-'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
