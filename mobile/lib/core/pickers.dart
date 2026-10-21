import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

/// A file chosen on the device, ready for [ApiClient.upload].
class PickedFile {
  final List<int> bytes;
  final String name;
  const PickedFile(this.bytes, this.name);
}

/// The backend's multipart limit (spring.servlet.multipart.max-file-size).
const maxUploadBytes = 10 * 1024 * 1024;
const maxPhotoBytes = 5 * 1024 * 1024;

bool get _hasCamera => !kIsWeb && (defaultTargetPlatform == TargetPlatform.android || defaultTargetPlatform == TargetPlatform.iOS);

/// Asks camera-or-gallery (gallery only where there is no camera), then
/// returns the image downscaled to at most 1024 px, or null if cancelled.
Future<PickedFile?> pickPhoto(BuildContext context) async {
  ImageSource? source = ImageSource.gallery;
  if (_hasCamera) {
    source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
            leading: const Icon(Icons.photo_camera_outlined),
            title: const Text('Take a photo'),
            onTap: () => Navigator.pop(ctx, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined),
            title: const Text('Choose from gallery'),
            onTap: () => Navigator.pop(ctx, ImageSource.gallery),
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }
  if (source == null) return null;
  final file = await ImagePicker().pickImage(source: source, maxWidth: 1024, maxHeight: 1024, imageQuality: 85);
  if (file == null) return null;
  return PickedFile(await file.readAsBytes(), file.name);
}

/// A registration certificate or licence: PDF or image.
Future<PickedFile?> pickDocument() async {
  final file = await FilePicker.pickFile(
    type: FileType.custom,
    allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
  );
  if (file == null) return null;
  return PickedFile(await file.readAsBytes(), file.name);
}
