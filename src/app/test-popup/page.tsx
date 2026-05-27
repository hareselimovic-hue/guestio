import SubscriptionExpiryPopup from "@/components/SubscriptionExpiryPopup";

export default function TestPopupPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
      <p className="text-[#6B6B6B] text-sm">Popup preview stranica</p>
      <SubscriptionExpiryPopup daysLeft={3} />
    </div>
  );
}
