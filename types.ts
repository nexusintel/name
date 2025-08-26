

import { ObjectId } from 'mongodb';

export enum UserRole {
  USER = 'User',
  ADMIN = 'Admin',
  SUPER_ADMIN = 'Super-Admin'
}

// User object as stored in the database
export interface DBUser {
  _id: ObjectId;
  email: string;
  password?: string; // Hashed password
  fullName: string | null;
  role: UserRole;
  avatarUrl: string | null; 
  createdAt: string;
}

// User object for frontend consumption (no password)
export interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  avatarUrl: string | null; // Full URL to image
  createdAt: string;
}

export interface Teaching {
  _id?: string;
  created_at: string;
  title: string;
  speaker: string;
  preached_at: string;
  category: string;
  youtube_url: string;
  description: string;
}

export interface DBTeaching {
  _id: ObjectId;
  created_at: string;
  title: string;
  speaker: string;
  preached_at: string;
  category: string;
  youtube_url: string;
  description: string;
}

export interface Event {
  _id?: string;
  created_at: string;
  title: string;
  location: string;
  event_date: string;
  event_time: string;
  max_attendees?: number;
  registration_required: boolean;
  description: string;
  image_base64?: string | null;
}

export interface DBEvent {
  _id: ObjectId;
  created_at: string;
  title: string;
  location: string;
  event_date: string;
  event_time: string;
  max_attendees?: number;
  registration_required: boolean;
  description: string;
  image_base64?: string | null;
}


export enum PrayerRequestStatus {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export interface PrayerRequest {
  _id?: string;
  created_at: string;
  name: string;
  email: string;
  request_text: string;
  is_private: boolean;
  is_answered: boolean;
  user_id?: string; // ID of the user who submitted the request
  avatar_url?: string | null; // User's avatar URL
}

export interface DBPrayerRequest {
  _id: ObjectId;
  created_at: string;
  name: string;
  email: string;
  request_text: string;
  is_private: boolean;
  is_answered: boolean;
  user_id?: string; // ID of the user who submitted the request
  avatar_url?: string | null; // User's avatar URL
}

export interface SiteContent {
  _id?: string;
  page: 'home' | 'give' | 'contact';
  elements: { [key: string]: string };
}

export interface ChatMessage {
  _id?: string;
  created_at: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  // For private messages
  recipientId?: string | null;
}

export interface DBChatMessage {
  _id: ObjectId;
  created_at: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  recipientId?: string | null;
}

export interface ContactMessage {
    _id?: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    created_at: string;
}

export interface DBContactMessage {
    _id: ObjectId;
    name: string;
    email: string;
    subject: string;
    message: string;
    created_at: string;
}

export interface Leader {
  _id?: string;
  name: string;
  title: string;
  bio: string;
  photoUrl?: string;
  youtubeUrl: string;
  createdAt: string;
}

export interface DBLeader {
  _id: ObjectId;
  name: string;
  title: string;
  bio: string;
  photoUrl: string;
  youtubeUrl: string;
  createdAt: string;
}

export interface Testimony {
  _id?: string;
  created_at: string;
  name: string;
  title: string;
  story_text: string;
  is_approved: boolean;
}

export interface DBTestimony {
  _id: ObjectId;
  created_at: string;
  name: string;
  title: string;
  story_text: string;
  is_approved: boolean;
}

export interface MinistryTeam {
  _id?: string;
  name: string;
  description: string;
  leaderName: string;
  contactEmail: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DBMinistryTeam {
  _id: ObjectId;
  name: string;
  description: string;
  leaderName: string;
  contactEmail: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
}

export interface VolunteerApplication {
  _id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  teamId: string;
  teamName: string;
  message: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface DBVolunteerApplication {
  _id: ObjectId;
  userId: string;
  userName: string;
  userEmail: string;
  teamId: string;
  teamName: string;
  message: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface Blog {
  _id?: string;
  title: string;
  slug: string;
  content: string;
  authorName: string;
  authorId: string;
  featureImageUrl: string;
  status: 'draft' | 'published';
  createdAt: string;
  publishedAt?: string;
}

export interface DBBlog {
  _id: ObjectId;
  title: string;
  slug: string;
  content: string;
  authorName: string;
  authorId: string;
  featureImageUrl: string;
  status: 'draft' | 'published';
  createdAt: string;
  publishedAt?: string;
}

export interface MediaAsset {
  url: string;
  publicId: string;
  alt?: string;
  caption?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface LightCampus {
  _id?: string;
  name: string;
  location: string;
  leaderName: string;
  contactInfo: string;
  meetingSchedule: string;
  imageUrl?: string;
  images?: MediaAsset[]; // Array of campus images
  isActive: boolean;
  createdAt: string;
}

export interface DBLightCampus {
  _id: ObjectId;
  name: string;
  location: string;
  leaderName: string;
  contactInfo: string;
  meetingSchedule: string;
  imageUrl?: string;
  images?: MediaAsset[]; // Array of campus images
  isActive: boolean;
  createdAt: string;
}

export interface LightCampusApplication {
  _id?: string;
  applicantUserId: string;
  applicantName: string;
  applicantEmail: string;
  proposedCampusName: string;
  proposedLocation: string;
  proposedLeaderName: string;
  contactInfo: string;
  missionStatement: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface DBLightCampusApplication {
  _id: ObjectId;
  applicantUserId: string;
  applicantName: string;
  applicantEmail: string;
  proposedCampusName: string;
  proposedLocation: string;
  proposedLeaderName: string;
  contactInfo: string;
  missionStatement: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface TorchKidsContent {
  _id?: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutText: string;
  safetyText: string;
  experienceText: string;
  groupsText: string;
}

export interface DBTorchKidsContent {
    _id: ObjectId;
    heroTitle: string;
    heroSubtitle: string;
    aboutText: string;
    safetyText: string;
    experienceText: string;
    groupsText: string;
}