import AdminSidebar from '../layouts/AdminSidebar';

export default function AdminHome() {
  return (
    <div className="flex w-full h-full">
      <AdminSidebar />
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