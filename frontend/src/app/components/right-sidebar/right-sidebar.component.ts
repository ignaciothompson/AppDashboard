import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './right-sidebar.component.html',
  styleUrls: ['./right-sidebar.component.css']
})
export class RightSidebarComponent {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  // Calendar state
  currentDate = new Date();
  calendarDays: { date: number; isToday: boolean; isCurrentMonth: boolean }[] = [];
  
  // Placeholder data for notes and todos
  notes: { id: string; title: string; preview: string; date: Date }[] = [
    { id: '1', title: 'Project Ideas', preview: 'New dashboard features to implement...', date: new Date() },
    { id: '2', title: 'Meeting Notes', preview: 'Discussed deployment strategy...', date: new Date(Date.now() - 86400000) }
  ];
  
  todos: { id: string; text: string; completed: boolean }[] = [
    { id: '1', text: 'Review pull requests', completed: false },
    { id: '2', text: 'Update documentation', completed: false },
    { id: '3', text: 'Deploy to production', completed: true }
  ];

  constructor() {
    this.generateCalendar();
  }

  close() {
    this.closed.emit();
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Sunday of the first week
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    this.calendarDays = [];
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      this.calendarDays.push({
        date: date.getDate(),
        isToday: this.isSameDay(date, today),
        isCurrentMonth: date.getMonth() === month
      });
    }
  }

  isSameDay(d1: Date, d2: Date): boolean {
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
  }

  previousMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.generateCalendar();
  }

  get monthYear(): string {
    return this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  toggleTodo(todo: { id: string; text: string; completed: boolean }) {
    todo.completed = !todo.completed;
  }
}
