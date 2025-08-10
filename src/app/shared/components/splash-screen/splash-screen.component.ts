import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash-screen',
  templateUrl: './splash-screen.component.html',
  styleUrls: ['./splash-screen.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class SplashScreenComponent implements OnInit {
  @Output() splashComplete = new EventEmitter<void>();
  
  fadeOut = false;

  ngOnInit() {
    // Afficher le splash pendant 6 secondes
    setTimeout(() => {
      this.fadeOut = true;
      
      // Attendre la fin de l'animation fade-out
      setTimeout(() => {
        this.splashComplete.emit();
      }, 500);
    }, 6000);
  }
}