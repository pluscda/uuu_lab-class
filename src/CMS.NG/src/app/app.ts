import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

interface NavGroup {
  label: string;
  icon: string;
  expanded: boolean;
  items: NavItem[];
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastModule, ConfirmDialogModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('CMS');
  protected readonly sidebarCollapsed = signal(false);

  protected readonly navGroups = signal<NavGroup[]>([
    {
      label: '系統管理 Admin',
      icon: 'pi pi-shield',
      expanded: true,
      items: [{ label: '角色 AppRole', icon: 'pi pi-id-card', route: '/app-roles' }]
    }
  ]);

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  toggleGroup(group: NavGroup): void {
    this.navGroups.update(groups =>
      groups.map(g => (g === group ? { ...g, expanded: !g.expanded } : g))
    );
  }
}
