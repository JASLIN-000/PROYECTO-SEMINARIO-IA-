import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className='min-h-screen bg-[#F5F5F5]'>
      <Sidebar collapsed={collapsed} />
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side='left' className='w-[290px] max-w-[290px] border-r border-black/5 p-0'>
          <Sidebar collapsed={false} mobile />
        </SheetContent>
      </Sheet>

      <div className='lg:pl-[240px]'>
        <div className='flex min-h-screen flex-1 flex-col gap-4 p-4 lg:p-5'>
          <Navbar
            onOpenMobileSidebar={() => setMobileOpen(true)}
            onToggleDesktopSidebar={() => setCollapsed((state) => !state)}
          />
          <main className='flex-1'>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
