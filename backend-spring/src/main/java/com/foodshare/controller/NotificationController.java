package com.foodshare.controller;

import com.foodshare.model.Notification;
import com.foodshare.service.NotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/{userId}")
    public Map<String, Object> list(@PathVariable String userId) {
        List<Notification> notifications = notificationService.forUser(userId);
        long unread = notifications.stream().filter(n -> !n.isRead()).count();
        return Map.of("notifications", notifications, "unreadCount", unread);
    }

    @PatchMapping("/{id}/read")
    public Map<String, Object> markRead(@PathVariable String id) {
        return Map.of("notification", notificationService.markRead(id));
    }

    @PatchMapping("/{userId}/read-all")
    public Map<String, Object> markAllRead(@PathVariable String userId) {
        notificationService.markAllRead(userId);
        return Map.of("message", "All marked as read");
    }
}
