import SettingsScreen from "./SettingsScreen";

/**
 * Settings.
 *
 * Deliberately not one of the four global destinations: it has no place in
 * the bottom bar, because a child does not navigate here on the way to
 * anything. It is reached from a small control on Home and goes back there.
 */
// The product's name is appended by the title template in the root layout.
export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <SettingsScreen />
    </div>
  );
}
