import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuperAdminNavBar } from '../super-admin-nav-bar/super-admin-nav-bar';
import { AuthService } from '../../components/navbar/navbar';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, SuperAdminNavBar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements AfterViewInit {
  @ViewChild('userChart') private chartRef!: ElementRef;
  chart: any;

  userName: string = 'Christopher';
  
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

  constructor(private authService: AuthService) {
    const currentUser = this.authService.currentUser;
    if (currentUser?.Firstname && currentUser?.Lastname) {
      this.userName = `${currentUser.Firstname} ${currentUser.Lastname}`;
    } else if (currentUser?.Firstname) {
      this.userName = currentUser.Firstname;
    }
  }

  ngAfterViewInit(): void {
    this.createChart();
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
            data: [30, 65, 85, 120, 180, 230],
            borderColor: '#800000',
            backgroundColor: 'rgba(128, 0, 0, 0.1)',
            fill: false,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              grid: {
                display: false
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
