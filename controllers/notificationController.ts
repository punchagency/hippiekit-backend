import { Request, Response } from 'express';
import Notification from '../models/Notification.js';

type AsyncHandler = (req: Request, res: Response) => Promise<any>;

// @desc    Get all notifications for authenticated user
// @route   GET /api/notifications
// @access  Private
export const getNotifications: AsyncHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ userId });
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead: AsyncHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
export const markAllAsRead: AsyncHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user._id;

    await Notification.updateMany({ userId, isRead: false }, { isRead: true });

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message,
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification: AsyncHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user._id;
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message,
    });
  }
};

// @desc    Delete all notifications for user
// @route   DELETE /api/notifications
// @access  Private
export const deleteAllNotifications: AsyncHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user._id;

    await Notification.deleteMany({ userId });

    return res.status(200).json({
      success: true,
      message: 'All notifications deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting all notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notifications',
      error: error.message,
    });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount: AsyncHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user._id;

    const count = await Notification.countDocuments({ userId, isRead: false });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error: any) {
    console.error('Error getting unread count:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message,
    });
  }
};
