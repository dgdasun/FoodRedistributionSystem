package com.foodshare.service;

import com.foodshare.model.Notification;
import com.foodshare.model.User;
import com.foodshare.repository.NotificationRepository;
import com.foodshare.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
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

    /** Sends the same message to every admin account, for events that need an admin to act. */
    public void notifyAdmins(String type, String message) {
        for (User admin : userRepository.findByRoleOrderByCreatedAtDesc("admin")) {
            notify(admin.getId(), type, message);
        }
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
