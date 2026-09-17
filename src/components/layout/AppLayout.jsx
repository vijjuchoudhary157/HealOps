import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <>
      <Header />
      <Sidebar />
      <div className="pl-64">
        <main className="relative w-full pt-16 bg-surface min-h-screen px-gutter py-space-lg">
          <Outlet />
        </main>
      </div>
    </>
  );
}
