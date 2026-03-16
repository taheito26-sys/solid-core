import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TrackerTopbar } from './TrackerTopbar';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <TrackerTopbar />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
