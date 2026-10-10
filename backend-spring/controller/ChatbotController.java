package com.foodshare.controller;

import com.foodshare.dto.ChatRequestDTO;
import com.foodshare.dto.ChatResponseDTO;
import com.foodshare.service.ChatbotService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    private final ChatbotService chatbotService;

    public ChatbotController(ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    @PostMapping
    public ChatResponseDTO chat(@RequestBody ChatRequestDTO request) {
        return new ChatResponseDTO(chatbotService.reply(request.getMessage()));
    }
}
