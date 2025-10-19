import { Component, AfterViewInit, ElementRef, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSideNav } from '../admin-side-nav/admin-side-nav';
import { Auth } from '../../service/auth';
import { User } from '../../interface/auth';
import { AnalyticsService } from '../../service/analytics.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-admin-side-dashboard',
  standalone: true,
  imports: [AdminSideNav, CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class AdminSideDashboard implements AfterViewInit, OnInit {
  // ViewChild to get a reference to the canvas element
  @ViewChild('userChart') private chartRef!: ElementRef;
  @ViewChild('requestTypeChart') private requestTypeChartRef!: ElementRef;
  @ViewChild('tagsChart') private tagsChartRef!: ElementRef;
  chart: any;
  requestTypeChart: any;
  tagsChart: any;
  
  // Monthly requests data
  monthlyRequestsData = {
    months: [] as string[],
    studentRequests: [] as number[],
    guestRequests: [] as number[]
  };
  
  // Expose Math to template
  Math = Math;

  // Services
  private authService = inject(Auth);
  private analyticsService = inject(AnalyticsService);
  
  // Current user data
  currentUser: User | null = null;
  userName: string = 'Admin';
  userRole: string = 'Admin';
  isDean: boolean = false;
  
  // Loading state
  isLoading: boolean = true;
  
  // Selected period
  selectedPeriod: string = 'this_month';
  
  // Role-based stats
  stats = {
    totalThesis: '0',
    totalUsers: '0',
    totalRequests: '0',
    totalDownloads: '0',
    registeredNonPUP: '0',
    pendingApprovals: '0'
  };

  // Percentage changes
  changes = {
    thesis: 0,
    users: 0,
    requests: 0,
    downloads: 0
  };

  topKeywords: { name: string; access: number }[] = [];
  docsPerDepartment: { name: string; total: number }[] = [];
  requestsByType = { student: 0, guest: 0 };

  constructor() {
    // Get current user data
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.userName = user.Firstname || user.firstname || 'Admin';
        this.userRole = this.getUserRole(user.role_id);
        this.isDean = user.role_id === 5;
      }
    });
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Charts will be created after data is loaded
  }

  getUserRole(roleId?: number): string {
    switch (roleId) {
      case 4:
        return 'Chairperson';
      case 5:
        return 'Dean';
      default:
        return 'Admin';
    }
  }

  onPeriodChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedPeriod = target.value;
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.analyticsService.getDashboardAnalytics(this.selectedPeriod).subscribe({
      next: (data) => {
        console.log('📊 Dashboard analytics loaded:', data);
        
        // Update stats with formatting
        this.stats = {
          totalThesis: this.formatNumber(data.totalThesis),
          totalUsers: this.formatNumber(data.totalUsers),
          totalRequests: this.formatNumber(data.totalRequests),
          totalDownloads: this.formatNumber(data.totalDownloads),
          registeredNonPUP: this.formatNumber(data.registeredNonPUP),
          pendingApprovals: '0'
        };

        // Update keywords
        this.topKeywords = data.commonKeywords.slice(0, 5).map(k => ({
          name: k.keyword,
          access: k.count
        }));

        // Update documents per program
        this.docsPerDepartment = data.docsPerProgram.map(p => ({
          name: p.program_name,
          total: p.count
        }));

        // Update requests by type
        this.requestsByType = data.requestsByType;

        // Update percentage changes
        this.changes = data.changes;

        this.isLoading = false;

        // Fetch monthly requests data for time-based chart
        this.analyticsService.getMonthlyRequestsData(6).subscribe({
          next: (monthlyData) => {
            this.monthlyRequestsData = monthlyData;
            
            // Create charts after all data is loaded
            setTimeout(() => {
              this.createChart();
              this.createRequestTypeChart();
              this.createTagsChart();
            }, 100);
          },
          error: (error) => {
            console.error('❌ Error loading monthly requests data:', error);
            // Still create charts even if monthly data fails
            setTimeout(() => {
              this.createChart();
              this.createRequestTypeChart();
              this.createTagsChart();
            }, 100);
          }
        });
      },
      error: (error) => {
        console.error('❌ Error loading dashboard analytics:', error);
        this.isLoading = false;
      }
    });
  }

  formatNumber(num: number): string {
    if (num >= 1000) {
      return num.toLocaleString('en-US');
    }
    return num.toString();
  }

  getComparisonText(): string {
    switch (this.selectedPeriod) {
      case 'today':
        return 'vs. yesterday';
      case 'this_year':
        return 'vs. last year';
      default:
        return 'vs. last month';
    }
  }

  createChart(): void {
    if (!this.chartRef) return;
    
    const canvas = this.chartRef.nativeElement;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Destroy existing chart if it exists
      if (this.chart) {
        this.chart.destroy();
      }

      const totalUsers = parseInt(this.stats.totalUsers.replace(/,/g, ''));
      const maxValue = Math.ceil(totalUsers / 100) * 100;

      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['8:00 AM', '11:00 AM', '2:00 PM', '5:00 PM', '8:00 PM', '11:00 PM'],
          datasets: [{
            label: 'Users',
            data: [
              Math.floor(totalUsers * 0.4),
              Math.floor(totalUsers * 0.5),
              Math.floor(totalUsers * 0.7),
              Math.floor(totalUsers * 0.85),
              Math.floor(totalUsers * 0.95),
              totalUsers
            ],
            borderColor: '#800000',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              enabled: true,
              backgroundColor: '#800000',
              titleColor: '#fff',
              bodyColor: '#fff',
              padding: 12,
              displayColors: false
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: '#666',
                font: {
                  size: 11
                }
              },
              border: {
                display: false
              }
            },
            y: {
              beginAtZero: true,
              max: maxValue,
              grid: {
                color: '#f0f0f0'
              },
              ticks: {
                stepSize: Math.ceil(maxValue / 5),
                color: '#666',
                font: {
                  size: 11
                }
              },
              border: {
                display: false
              }
            }
          },
          layout: {
            padding: {
              top: 10,
              right: 10,
              bottom: 10,
              left: 10
            }
          }
        }
      });
    }
  }

  createRequestTypeChart(): void {
    if (!this.requestTypeChartRef) return;
    
    const canvas = this.requestTypeChartRef.nativeElement;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Destroy existing chart if it exists
      if (this.requestTypeChart) {
        this.requestTypeChart.destroy();
      }

      // Use real data from backend (fetched via analytics service)
      const monthLabels = this.monthlyRequestsData.months.length > 0 
        ? this.monthlyRequestsData.months 
        : ['Loading...'];
      const studentRequestsData = this.monthlyRequestsData.studentRequests.length > 0
        ? this.monthlyRequestsData.studentRequests
        : [0];
      const guestRequestsData = this.monthlyRequestsData.guestRequests.length > 0
        ? this.monthlyRequestsData.guestRequests
        : [0];

      this.requestTypeChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [
            {
              label: 'Student Requests',
              data: studentRequestsData,
              backgroundColor: '#800000',
              borderColor: '#800000',
              borderWidth: 0,
              borderRadius: 6,
              barThickness: 25
            },
            {
              label: 'Guest Requests',
              data: guestRequestsData,
              backgroundColor: '#C8A882',
              borderColor: '#C8A882',
              borderWidth: 0,
              borderRadius: 6,
              barThickness: 25
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                color: '#666',
                font: {
                  size: 12
                },
                padding: 15,
                usePointStyle: true,
                pointStyle: 'rectRounded'
              }
            },
            tooltip: {
              enabled: true,
              backgroundColor: '#800000',
              titleColor: '#fff',
              bodyColor: '#fff',
              padding: 12,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: '#666',
                font: {
                  size: 11
                }
              },
              border: {
                display: false
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: '#f0f0f0'
              },
              ticks: {
                color: '#666',
                font: {
                  size: 11
                },
                precision: 0
              },
              border: {
                display: false
              }
            }
          },
          layout: {
            padding: {
              top: 10,
              right: 10,
              bottom: 10,
              left: 10
            }
          }
        }
      });
    }
  }

  getChangeClass(value: number): string {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }

  getChangeSymbol(value: number): string {
    if (value > 0) return '↑';
    if (value < 0) return '↓';
    return '–';
  }

  createTagsChart(): void {
    if (!this.tagsChartRef) return;
    
    const canvas = this.tagsChartRef.nativeElement;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Destroy existing chart if it exists
      if (this.tagsChart) {
        this.tagsChart.destroy();
      }

      // Prepare data from topKeywords
      const labels = this.topKeywords.map(k => k.name);
      const data = this.topKeywords.map(k => k.access);
      const colors = this.topKeywords.map((_, i) => this.getChartColor(i));

      this.tagsChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors,
            borderColor: '#ffffff',
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false  // Using custom HTML legend
            },
            tooltip: {
              enabled: true,
              backgroundColor: '#800000',
              titleColor: '#fff',
              bodyColor: '#fff',
              padding: 12,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }
  }

  getChartColor(index: number): string {
    const colors = [
      '#FF6384', // Red/Pink
      '#36A2EB', // Blue
      '#FFCE56', // Yellow
      '#4BC0C0', // Teal
      '#9966FF', // Purple
      '#FF9F40', // Orange
      '#C9CBCF', // Gray
      '#800000', // Maroon
      '#C8A882', // Tan
      '#4A5568'  // Dark gray
    ];
    return colors[index % colors.length];
  }
}

