import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Footer } from "../footer/footer";
import { Navbar } from "../navbar/navbar";
import { LoginModal } from '../login-modal/login-modal';

@Component({
  selector: 'app-search-result',
  standalone: true,
  imports: [Footer, Navbar, LoginModal],
  templateUrl: './search-result.html',
  styleUrl: './search-result.css'
})
export class SearchResult {
  // Makes sure modal not visible
  isLoginModalVisible = false;

  //Placeholder
  document = {
    title: 'Optimizing Urban Traffic Flow Using Reinforcement Learning and Real-Time Sensor Data',
    abstract: 'Urban traffic congestion remains a persistent issue in modern cities, leading to economic inefficiencies, increased emissions, and commuter frustration. This study introduces a reinforcement learning (RL)-based framework that utilizes real-time sensor data to optimize traffic signal control across urban intersections. By employing a model-free Deep Q-Learning algorithm, the system enables an intelligent agent to learn adaptive signal timing strategies aimed at minimizing vehicle waiting times, congestion levels, and travel delays. Real-time inputs from simulated sensors—such as vehicle counts, queue lengths, and speeds—are used to inform decision-making in a dynamic environment. The model is trained and evaluated in a microsimulation platform designed to reflect real-world traffic conditions, demonstrating significant improvements over traditional fixed-time and actuated control systems in metrics such as average travel time, throughput, and fuel consumption. Furthermore, the system exhibits strong adaptability to non-stationary scenarios like peak hours or road incidents, and it scales effectively across multiple intersections. This research highlights the potential of combining reinforcement learning with real-time data to create a more responsive and efficient urban traffic management system, paving the way for future developments involving real-world deployment and cooperative multi-agent learning strategies.',
    dateOfPublication: '2023, March 30',
    degreeName: 'Bachelor of Science in Accountancy',
    subjectCategories: 'Road Management | Technology and Innovation',
    authors: 'Evangelista, Christopher Bryan S.',
    college: 'College of Computer and Information Sciences',
    documentType: 'Bachelor\'s Thesis'
  };
  // Inject the Router service in the constructor
  constructor(private router: Router) { }

  // New method to handle the click event and navigate
  onReturnClick(): void {
    // This will navigate to the specified route
    // Replace 'your-page-route' with the actual route you want to go to
    this.router.navigate(['/search-thesis']);
  }

  // Pop up Function
  openLoginModal(): void {
    this.isLoginModalVisible = true;
  }

  closeLoginModal(): void {
    this.isLoginModalVisible = false;
  }
}
