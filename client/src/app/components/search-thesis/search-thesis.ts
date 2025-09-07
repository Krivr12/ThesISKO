import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { Footer } from "../footer/footer";
import { Router } from '@angular/router';

interface Thesis {
  title: string;
  author: string;
  year: number;
  keywords: string[];
}

@Component({
  selector: 'app-search-thesis',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Footer],
  templateUrl: './search-thesis.html',
  styleUrl: './search-thesis.css'
})
export class SearchThesis implements OnInit {
  constructor(private router: Router) {}
  totalItems: number = 0;
  itemsPerPage: number = 8;
  currentPage: number = 1;
  maxPageButtons: number = 5;
  totalPages: number = 0;
  pages: number[] = [];
  
  isCollapsed: boolean = false;
  searchQuery: string = '';
  
  // filter states
  selectedTags: string[] = [];
  selectedYear: string = '';
  authorName: string = '';

  // can add tags here
  predefinedTags = signal<string[]>([
    'Technology',
    'Information Systems',
    'Web Application',
    'Mobile Application',
    'Artificial Intelligence',
    'Data Science',
    'Cloud Computing',
    'Cybersecurity',
    'User Experience',
    'Database'
  ]);

  // get unique years from theses
  availableYears = signal<number[]>([]);

  allTheses: Thesis[] = [
    {
      title: 'Optimizing Urban Traffic Flow Using Reinforcement Learning and Real-Time Sensor Data',
      author: 'C.B. Evangelista',
      year: 2024,
      keywords: ['Traffic Flow', 'Real-Time Sensor', 'Machine Learning', 'Reinforcement']
    },
    {
      title: 'A Deep Dive into Convolutional Neural Networks for Image Recognition',
      author: 'M.A. Del Rosario',
      year: 2023,
      keywords: ['Neural Networks', 'Image Recognition', 'Deep Learning', 'Computer Vision']
    },
    {
      title: 'The Impact of Climate Change on Agricultural Productivity in Southeast Asia',
      author: 'J.P. Reyes',
      year: 2022,
      keywords: ['Climate Change', 'Agriculture', 'Southeast Asia', 'Environmental Science']
    },
    {
      title: 'Blockchain Technology in Supply Chain Management: A Case Study',
      author: 'A.L. Cruz',
      year: 2024,
      keywords: ['Blockchain', 'Supply Chain', 'Logistics', 'Decentralization']
    },
    {
      title: 'Enhancing Cybersecurity Defenses with AI-Powered Threat Detection',
      author: 'R.M. Santiago',
      year: 2023,
      keywords: ['Cybersecurity', 'AI', 'Threat Detection', 'Network Security']
    },
    {
      title: 'Sustainable Urban Planning: Integrating Green Spaces and Public Transport',
      author: 'S.D. Gonzales',
      year: 2022,
      keywords: ['Urban Planning', 'Sustainability', 'Green Spaces', 'Public Transport']
    },
    {
      title: 'The Role of Big Data Analytics in Modern Healthcare Systems',
      author: 'P.C. Aquino',
      year: 2024,
      keywords: ['Big Data', 'Healthcare', 'Analytics', 'Medical Informatics']
    },
    {
      title: 'Development of a Smart Home Automation System Using IoT',
      author: 'K.F. Lim',
      year: 2023,
      keywords: ['Smart Home', 'IoT', 'Automation', 'Embedded Systems']
    },
    {
      title: 'Analyzing Social Media Sentiment for Brand Reputation Management',
      author: 'E.V. Tan',
      year: 2022,
      keywords: ['Social Media', 'Sentiment Analysis', 'Brand Management', 'Marketing']
    },
    {
      title: 'Predictive Modeling for Financial Market Trends using Machine Learning',
      author: 'L.G. Garcia',
      year: 2024,
      keywords: ['Predictive Modeling', 'Financial Markets', 'Machine Learning', 'Economics']
    },
    {
      title: 'Advanced Robotics for Autonomous Navigation in Unstructured Environments',
      author: 'B.H. Ramos',
      year: 2023,
      keywords: ['Robotics', 'Autonomous Navigation', 'AI', 'Control Systems']
    },
    {
      title: 'Impact of Renewable Energy Sources on National Power Grids',
      author: 'D.N. Santos',
      year: 2022,
      keywords: ['Renewable Energy', 'Power Grids', 'Energy Policy', 'Sustainable Development']
    },
    {
      title: 'User Interface Design Principles for Accessible Web Applications',
      author: 'F.I. Castro',
      year: 2024,
      keywords: ['UI Design', 'Accessibility', 'Web Development', 'User Experience']
    },
    {
      title: 'The Efficacy of Gamification in Online Education Platforms',
      author: 'G.J. Rivera',
      year: 2023,
      keywords: ['Gamification', 'Online Education', 'E-learning', 'Pedagogy']
    },
    {
      title: 'Developing Sustainable Waste Management Strategies for Urban Areas',
      author: 'H.K. Mendoza',
      year: 2022,
      keywords: ['Waste Management', 'Sustainability', 'Urban Areas', 'Environmental Engineering']
    },
    {
      title: 'Artificial Intelligence in Drug Discovery and Development',
      author: 'I.L. Torres',
      year: 2024,
      keywords: ['AI', 'Drug Discovery', 'Pharmaceuticals', 'Biomedical Engineering']
    },
    {
      title: 'The Role of Social Support in Mental Health Resilience among College Students',
      author: 'J.P. Lim',
      year: 2023,
      keywords: ['Mental Health', 'Social Support', 'College Students', 'Psychology']
    },
    {
      title: 'Analyzing the Economic Impact of Tourism on Local Communities',
      author: 'K.R. Reyes',
      year: 2024,
      keywords: ['Tourism', 'Economic Impact', 'Local Communities', 'Sociology']
    },
    {
      title: 'Development of a Mobile Application for Language Learning',
      author: 'L.M. Cruz',
      year: 2022,
      keywords: ['Mobile Application', 'Language Learning', 'EdTech', 'Software Engineering']
    },
    {
      title: 'A Comparative Study of Agile vs. Waterfall Software Development Methodologies',
      author: 'N.O. Santos',
      year: 2024,
      keywords: ['Agile', 'Waterfall', 'Software Development', 'Project Management']
    },
    {
      title: 'The Use of Drones in Precision Agriculture for Crop Monitoring',
      author: 'P.Q. Gonzales',
      year: 2023,
      keywords: ['Drones', 'Precision Agriculture', 'Crop Monitoring', 'Technology']
    },
    {
      title: 'Examining the Effects of Remote Work on Employee Productivity and Well-being',
      author: 'R.S. Aquino',
      year: 2022,
      keywords: ['Remote Work', 'Productivity', 'Well-being', 'Human Resources']
    },
    {
      title: 'The Future of Sustainable Architecture in Urban Environments',
      author: 'T.U. Ramos',
      year: 2024,
      keywords: ['Sustainable Architecture', 'Urban Design', 'Environmental Sustainability', 'Design']
    },
    {
      title: 'Application of Machine Learning in Predictive Maintenance of Industrial Machinery',
      author: 'V.W. Tan',
      year: 2023,
      keywords: ['Machine Learning', 'Predictive Maintenance', 'Industrial Engineering', 'AI']
    },
    {
      title: 'Analyzing Consumer Behavior on E-commerce Platforms',
      author: 'X.Y. Castro',
      year: 2022,
      keywords: ['Consumer Behavior', 'E-commerce', 'Marketing', 'Data Analytics']
    },
    {
      title: 'Ethical Considerations in the Development of Autonomous Vehicles',
      author: 'A.B. Rivera',
      year: 2024,
      keywords: ['Ethics', 'Autonomous Vehicles', 'AI', 'Safety']
    },
  ];

  filteredTheses: Thesis[] = [];
  displayedTheses: Thesis[] = [];

  ngOnInit(): void {
    // Extract unique years from theses
    const years = [...new Set(this.allTheses.map(thesis => thesis.year))].sort((a, b) => b - a);
    this.availableYears.set(years);
    
    this.applyFilters();
  }

  toggleFilters(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onTagChange(tag: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    
    if (isChecked) {
      this.selectedTags.push(tag);
    } else {
      this.selectedTags = this.selectedTags.filter(t => t !== tag);
    }
    
    this.currentPage = 1;
    this.applyFilters();
  }

  onYearChange(year: string): void {
    this.selectedYear = year;
    this.currentPage = 1;
    this.applyFilters();
  }

  onAuthorChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedTags = [];
    this.selectedYear = '';
    this.authorName = '';
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredTheses = this.allTheses.filter(thesis => {
      // Search query filter
      const matchesSearch = this.searchQuery === '' || 
        thesis.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        thesis.author.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        thesis.keywords.some(kw => kw.toLowerCase().includes(this.searchQuery.toLowerCase()));
      
      // Tag filter
      const matchesTags = this.selectedTags.length === 0 || 
        this.selectedTags.some(tag => 
          thesis.keywords.some(kw => kw.toLowerCase().includes(tag.toLowerCase()))
        );
      
      // Year filter
      const matchesYear = this.selectedYear === '' || 
        thesis.year.toString() === this.selectedYear;
      
      // Author filter
      const matchesAuthor = this.authorName === '' || 
        thesis.author.toLowerCase().includes(this.authorName.toLowerCase());
      
      return matchesSearch && matchesTags && matchesYear && matchesAuthor;
    });
    
    this.totalItems = this.filteredTheses.length;
    this.calculatePagination();
    this.updateDisplayedTheses();
  }

  private calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.pages = this.getPageRange();
  }

  private getPageRange(): number[] {
    let startPage: number, endPage: number;
    const halfMaxButtons = Math.floor(this.maxPageButtons / 2);

    if (this.totalPages <= this.maxPageButtons) {
      startPage = 1;
      endPage = this.totalPages;
    } else if (this.currentPage <= halfMaxButtons) {
      startPage = 1;
      endPage = this.maxPageButtons;
    } else if (this.currentPage + halfMaxButtons >= this.totalPages) {
      startPage = this.totalPages - this.maxPageButtons + 1;
      endPage = this.totalPages;
    } else {
      startPage = this.currentPage - halfMaxButtons;
      endPage = this.currentPage + halfMaxButtons;
    }

    return Array.from(Array(endPage - startPage + 1).keys()).map(i => startPage + i);
  }

  private updateDisplayedTheses(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.displayedTheses = this.filteredTheses.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.calculatePagination();
      this.updateDisplayedTheses();
    }
  }

  viewThesis(thesis: Thesis): void {
    this.router.navigate(['/search-result'], { 
      state: { thesis: thesis } 
    });
  }
}