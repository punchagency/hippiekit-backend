import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark all as read
router.patch('/read-all', markAllAsRead);

// Get all notifications and delete all
router.route('/').get(getNotifications).delete(deleteAllNotifications);

// Mark as read, delete specific notification
router.route('/:id/read').patch(markAsRead);
router.route('/:id').delete(deleteNotification);

export default router;
