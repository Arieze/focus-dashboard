import type { CompanionSettings as Preferences } from "./settings";

export default function CompanionSettings({ value, onChange }: {
  value: Preferences;
  onChange: (value: Preferences) => void;
}) {
  return <>
    <h3>Compagnon</h3>
    <label className="check">
      <input type="checkbox" checked={value.enabled}
        onChange={(e) => onChange({ ...value, enabled: e.target.checked })} />
      Afficher le compagnon
    </label>
  </>;
}
