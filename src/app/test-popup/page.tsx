import SubscriptionExpiryPopup from "@/components/SubscriptionExpiryPopup";

export default function TestPopupPage() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <p className="text-ink-2 text-sm">Popup preview stranica</p>
      <SubscriptionExpiryPopup daysLeft={3} />
    </div>
  );
}
