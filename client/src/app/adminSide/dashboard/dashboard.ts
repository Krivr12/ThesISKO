import { Component, AfterViewInit, ElementRef, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AdminSideNav } from '../admin-side-nav/admin-side-nav';
import { Auth } from '../../service/auth';
import { User } from '../../interface/auth';
import { AnalyticsService } from '../../service/analytics.service';
import { environment } from '../../../environments/environment';
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
  private http = inject(HttpClient);
  
  // Current user data
  currentUser: User | null = null;
  userName: string = 'Admin';
  userRole: string = 'Admin';
  isDean: boolean = false;
  
  // Loading state
  isLoading: boolean = true;
  isLoadingViewedDocs: boolean = true;
  isLoadingUserGrowth: boolean = true;
  hasError: boolean = false;
  errorMessage: string = '';
  
  // Role-based stats
  stats = {
    totalThesis: '0',
    totalUsers: '0',
    totalRequests: '0',
    totalDownloads: '0',
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
  requestsByType = { student: 0, guest: 0 };
  mostViewedDocs: any[] = [];
  totalDocuments: number = 0;
  userGrowthData: { months: string[]; cumulativeUsers: number[] } = { months: [], cumulativeUsers: [] };

  constructor() {
        // Get current user data
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.userName = user.Firstname || user.firstname || 'Admin';
        this.userRole = this.getUserRole(user.role_id);
        this.isDean = user.role_id === 5;
        // Load pending approvals when user is available
        const userEmail = user.Email || user.email;
        if (userEmail) {
          this.loadPendingApprovals();
        }
      }
    });
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Charts will be created after data is loaded in loadDashboardData
    // This ensures the view is ready before creating charts
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

  refreshDashboard(): void {
    this.loadDashboardData();
    // Also refresh pending approvals
    this.loadPendingApprovals();
  }

  loadPendingApprovals(): void {
    const user = this.currentUser;
    // Check for both Email and email properties
    const userEmail = user?.Email || user?.email;
    if (!user || !userEmail) {
      this.stats.pendingApprovals = '0';
      return;
    }

    // Faculty users (role_id === 3) don't have access to pending approvals endpoints
    if (user.role_id === 3) {
      this.stats.pendingApprovals = '0';
      return;
    }

    // Determine endpoint based on user role (email removed from URL - comes from auth cookie)
    const isDean = user.role_id === 5;
    const isChairperson = user.role_id === 4;
    
    // Only make API call if user is dean or chairperson
    if (!isDean && !isChairperson) {
      this.stats.pendingApprovals = '0';
      return;
    }

    const endpoint = isDean 
      ? `${environment.apiUrl}/submissions/pending-dean`
      : `${environment.apiUrl}/submissions/pending-chairperson`;

    this.http.get<{ success: boolean; data: any[] }>(endpoint, {
      withCredentials: true // Include cookies in request
    })
      .subscribe({
        next: (response) => {
          const count = response.data?.length || 0;
          this.stats.pendingApprovals = this.formatNumber(count);
        },
        error: (error) => {
          this.stats.pendingApprovals = '0';
        }
      });
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    
    this.analyticsService.getDashboardAnalytics('this_month').subscribe({
      next: (data) => {
        // Update stats with formatting
        this.stats = {
          totalThesis: this.formatNumber(data.totalThesis),
          totalUsers: this.formatNumber(data.totalUsers),
          totalRequests: this.formatNumber(data.totalRequests),
          totalDownloads: this.formatNumber(data.totalDownloads),
          pendingApprovals: '0' // Will be updated by loadPendingApprovals
        };

        // Load pending approvals based on user role
        this.loadPendingApprovals();

        // Update keywords
        this.topKeywords = data.commonKeywords.slice(0, 5).map(k => ({
          name: k.keyword,
          access: k.count
        }));

        // Update requests by type
        this.requestsByType = data.requestsByType;

        // Update percentage changes
        this.changes = data.changes;

        // Fetch user growth data
        this.isLoadingUserGrowth = true;
        this.analyticsService.getUserGrowthData(6).subscribe({
          next: (growthData) => {
            this.userGrowthData = {
              months: growthData.months,
              cumulativeUsers: growthData.cumulativeUsers
            };
            this.isLoadingUserGrowth = false;
            // Create user growth chart after view update
            setTimeout(() => {
              if (this.chartRef?.nativeElement) {
                this.createChart();
              }
            }, 200);
          },
          error: (error) => {
            this.isLoadingUserGrowth = false;
            // Create chart with empty data
            setTimeout(() => {
              if (this.chartRef?.nativeElement) {
                this.createChart();
              }
            }, 200);
          }
        });

        // Fetch monthly requests data for time-based chart
        this.analyticsService.getMonthlyRequestsData(6).subscribe({
          next: (monthlyData) => {
            this.monthlyRequestsData = monthlyData;
            // Create request type chart after view update
            setTimeout(() => {
              if (this.requestTypeChartRef?.nativeElement) {
                this.createRequestTypeChart();
              }
            }, 200);
          },
          error: (error) => {
            // Create chart with empty data
            setTimeout(() => {
              if (this.requestTypeChartRef?.nativeElement) {
                this.createRequestTypeChart();
              }
            }, 200);
          }
        });

        // Create tags chart after keywords are loaded
        setTimeout(() => {
          if (this.tagsChartRef?.nativeElement) {
            this.createTagsChart();
          }
        }, 200);
        
        this.isLoading = false;

        // Fetch most requested documents
        this.analyticsService.getViewedDocuments(3).subscribe({
          next: (viewedData) => {
            this.mostViewedDocs = viewedData.mostViewed || [];
            this.totalDocuments = viewedData.totalDocuments || 0;
            this.isLoadingViewedDocs = false;
          },
          error: (error) => {
            this.isLoadingViewedDocs = false;
          }
        });
      },
      error: (error) => {
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = 'Failed to load dashboard data. Please try again.';
      }
    });
  }

  formatNumber(num: number): string {
    if (num >= 1000) {
      return num.toLocaleString('en-US');
    }
    return num.toString();
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

      // Use real user growth data
      const labels = this.userGrowthData.months.length > 0 
        ? this.userGrowthData.months 
        : ['No data'];
      const data = this.userGrowthData.cumulativeUsers.length > 0
        ? this.userGrowthData.cumulativeUsers
        : [0];
      
      // Calculate max value for y-axis, ensure it's at least 10
      const maxDataValue = data.length > 0 && Math.max(...data) > 0
        ? Math.max(...data)
        : 10;
      const maxValue = Math.ceil(maxDataValue / 100) * 100;

      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Total Users',
            data: data,
            borderColor: '#800000',
            backgroundColor: 'rgba(128, 0, 0, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#800000',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
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
              max: maxValue > 0 ? maxValue : undefined,
              grid: {
                color: '#f0f0f0'
              },
              ticks: {
                stepSize: maxValue > 0 ? Math.ceil(maxValue / 5) : undefined,
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
        : ['No data'];
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
      const labels = this.topKeywords.length > 0 
        ? this.topKeywords.map(k => k.name)
        : ['No data'];
      const data = this.topKeywords.length > 0
        ? this.topKeywords.map(k => k.access)
        : [1];
      const colors = this.topKeywords.length > 0
        ? this.topKeywords.map((_, i) => this.getChartColor(i))
        : ['#CCCCCC'];

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

