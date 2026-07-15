import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AuthService } from './core/services/auth.service';

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

const ADMIN_GROUP_LABEL = '系統管理 Admin';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastModule, ConfirmDialogModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly auth = inject(AuthService);

  protected readonly title = signal('CMS');
  protected readonly sidebarCollapsed = signal(false);

  protected readonly navGroups = signal<NavGroup[]>([
    {
      label: '首頁 Home',
      icon: 'pi pi-home',
      expanded: true,
      items: [
        {
          label: '上稿作業 FeaturedPromoItem',
          icon: 'pi pi-megaphone',
          route: '/featured-promo-items'
        }
      ]
    },
    {
      label: ADMIN_GROUP_LABEL,
      icon: 'pi pi-shield',
      expanded: true,
      items: [
        { label: '使用者 AppUser', icon: 'pi pi-user', route: '/app-users' },
        { label: '角色 AppRole', icon: 'pi pi-id-card', route: '/app-roles' },
        { label: '發布狀態 PublishStatus', icon: 'pi pi-flag', route: '/publish-statuses' }
      ]
    },
    {
      label: '課程管理 Course',
      icon: 'pi pi-book',
      expanded: true,
      items: [
        { label: '課程 Course', icon: 'pi pi-book', route: '/courses' },
        { label: '合作廠商 Partner', icon: 'pi pi-briefcase', route: '/partners' },
        { label: '課程群組 CourseGroup', icon: 'pi pi-sitemap', route: '/course-groups' }
      ]
    }
  ]);

  // 系統管理 Admin is only offered to users whose token roles include "Admin"
  protected readonly visibleNavGroups = computed(() =>
    this.navGroups().filter(g => g.label !== ADMIN_GROUP_LABEL || this.auth.isAdmin())
  );

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  toggleGroup(group: NavGroup): void {
    this.navGroups.update(groups =>
      groups.map(g => (g === group ? { ...g, expanded: !g.expanded } : g))
    );
  }

  logout(): void {
    this.auth.logout();
  }
}
