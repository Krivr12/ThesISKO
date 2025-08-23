import { Component, OnInit } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { Footer } from '../footer/footer';

interface UpdateItem {
  title: string;
  dateIssued: string;
  authors: string;
  tags: string[];
  access: string;
}

@Component({
  selector: 'app-home',
  imports: [Navbar, Footer,
    IconFieldModule,
    InputIconModule,
    ButtonModule,
    CarouselModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {

  updates: UpdateItem[] = [];

  responsiveOptions: any[] = [
    {
      breakpoint: '1199px',
      numVisible: 3,
      numScroll: 1
    },
    {
      breakpoint: '991px',
      numVisible: 2,
      numScroll: 1
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1
    }
  ];

  /*dito yung sa carousel */
  ngOnInit() {
    this.updates = [
      { title: 'Library System Upgrade', dateIssued: '2025-08-15', authors: 'Admin Team', tags: ['System', 'Update'], access: 'Public' },
      { title: 'New Repository Feature', dateIssued: '2025-08-12', authors: 'IT Dept.', tags: ['Repository'], access: 'Restricted' },
      { title: 'Maintenance Notice', dateIssued: '2025-08-10', authors: 'Library Staff', tags: ['Notice'], access: 'Public' },
      { title: 'New Digital Books', dateIssued: '2025-08-08', authors: 'Acquisitions', tags: ['Books', 'Digital'], access: 'Public' },
      { title: 'Security Patch Applied', dateIssued: '2025-08-05', authors: 'Tech Team', tags: ['Security'], access: 'Restricted' }
    ];
  }
}