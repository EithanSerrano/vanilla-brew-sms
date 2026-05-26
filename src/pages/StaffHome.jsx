import StaffSidebar from '../layouts/StaffSidebar';

export default function StaffHome() {
  return (
    <div className="flex w-full h-full">
      <StaffSidebar />
      <main className="flex-1 bg-white rounded-xl flex items-center justify-center overflow-hidden">
        <img
          src="/VNLBrewIcon.png"
          alt="Vanilla Brew Shop Management System"
          className="w-[600px] max-w-[80%] object-contain"
        />
      </main>
    </div>
  );
}