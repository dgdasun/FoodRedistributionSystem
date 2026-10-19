package com.foodshare.service;

import com.foodshare.model.Notification;
import com.foodshare.repository.NotificationRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public List<Notification> forUser(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long unreadCount(String userId) {
        return forUser(userId).stream().filter(n -> !n.isRead()).count();
    }

    public void notify(String userId, String type, String message) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setMessage(message);
        n.setRead(false);
        n.setCreatedAt(Instant.now());
        notificationRepository.save(n);
    }

    public Notification markRead(String id) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        n.setRead(true);
        return notificationRepository.save(n);
    }

    public void markAllRead(String userId) {
        List<Notification> notifications = forUser(userId);
        notifications.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(notifications);
    }
}
