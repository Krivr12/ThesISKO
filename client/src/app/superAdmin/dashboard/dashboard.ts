import { Component, AfterViewInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuperAdminNavBar } from '../super-admin-nav-bar/super-admin-nav-bar';
import { Auth } from '../../service/auth';
import { User } from '../../interface/auth';
import Chart from 'chart.js/auto';



@Component({
  selector: 'app-dashboard',
  imports: [SuperAdminNavBar, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements AfterViewInit {
  // ViewChild to get a reference to the canvas element
  @ViewChild('userChart') private chartRef!: ElementRef;
  chart: any;

  // Auth service
  private authService = inject(Auth);
  
  // Current user data
  currentUser: User | null = null;
  userName: string = 'Super Admin';
  userRole: string = 'Super Admin';
  
  // Role-based stats
  stats = {
    totalThesis: '1,250',
    totalUsers: '230',
    totalRequests: '575',
    totalDownloads: '200',
    registeredNonPUP: '30'
  };

  topKeywords = [
    { name: 'Artificial Intelligence', access: 45 },
    { name: 'Machine Learning', access: 37 },
    { name: 'Generative AI', access: 28 },
    { name: 'Neural Network', access: 21 },
    { name: 'Repository', access: 17 }
  ];

  docsPerDepartment = [
    { name: 'Bachelor of Science in Information Technology', total: 311 },
    { name: 'Bachelor of Science in Computer Science', total: 280 }
  ];

  constructor() {
    // Get current user data
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.userName = user.Firstname || user.firstname || 'Super Admin';
        this.userRole = this.getUserRole(user.role_id);
        this.updateStatsBasedOnRole(user.role_id);
      }
    });
  }

  ngAfterViewInit(): void {
    this.createChart();
  }

  getUserRole(roleId?: number): string {
    switch (roleId) {
      case 5:
        return 'Super Admin';
      case 8:
        return 'Super Admin & Faculty';
      default:
        return 'Super Admin';
    }
  }

  updateStatsBasedOnRole(roleId?: number): void {
    // Super Admin always gets full system stats
    this.stats = {
      totalThesis: '1,250',
      totalUsers: '230',
      totalRequests: '575',
      totalDownloads: '200',
      registeredNonPUP: '30'
    };
  }

  createChart(): void {
    const canvas = this.chartRef.nativeElement;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['8:00 AM', '11:00 AM', '2:00 PM', '5:00 PM', '8:00 PM', '11:00 PM'],
          datasets: [{
            label: 'Total Number of User',
            data: [50, 100, 80, 220, 180, 200],
            borderColor: '#800000',
            backgroundColor: 'rgba(128, 0, 0, 0.1)',
            fill: false,
            tension: 0.4 // Makes the line curved
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false // Hides the legend
            }
          },
          scales: {
            x: {
              grid: {
                display: false // Hides x-axis grid lines
              }
            },
            y: {
              beginAtZero: true,
              max: 250,
              ticks: {
                stepSize: 50
              }
            }
          }
        }
      });
    }
  }
}
