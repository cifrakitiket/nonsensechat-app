import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Default URL: for Android emulator, 10.0.2.2 points to host localhost:8787.
  // Can be changed to custom server IP.
  static String baseUrl = 'http://10.0.2.2:8787';

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access_token');
  }

  static Future<Map<String, dynamic>?> signIn(String email, String password) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/api/auth/signin'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        final data = body['data'];
        final session = data['session'];
        final token = session['access_token'];
        final user = data['user'];

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', token);
        await prefs.setString('user_id', user['id']);
        await prefs.setString('user_email', user['email']);

        return data;
      }
    } catch (e) {
      print('SignIn error: $e');
    }
    return null;
  }

  static Future<Map<String, dynamic>?> signUp(String email, String password) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/api/auth/signup'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        final data = body['data'];
        final session = data['session'];
        final token = session['access_token'];
        final user = data['user'];

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', token);
        await prefs.setString('user_id', user['id']);
        await prefs.setString('user_email', user['email']);

        return data;
      }
    } catch (e) {
      print('SignUp error: $e');
    }
    return null;
  }

  static Future<List<dynamic>> fetchChats() async {
    final token = await getToken();
    if (token == null) return [];

    try {
      final res = await http.post(
        Uri.parse('$baseUrl/api/query'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'table': 'chats',
        }),
      );

      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        return body['data'] ?? [];
      }
    } catch (e) {
      print('Fetch chats error: $e');
    }
    return [];
  }

  static Future<List<dynamic>> fetchMessages(String chatId) async {
    final token = await getToken();
    if (token == null) return [];

    try {
      final res = await http.post(
        Uri.parse('$baseUrl/api/query'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'table': 'messages',
          'wheres': [
            {'col': 'chat_id', 'op': 'eq', 'val': chatId}
          ],
          'order': {'col': 'at', 'ascending': true}
        }),
      );

      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        return body['data'] ?? [];
      }
    } catch (e) {
      print('Fetch messages error: $e');
    }
    return [];
  }

  static Future<bool> sendMessage(String chatId, String text) async {
    final token = await getToken();
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString('user_id') ?? '';
    final msgId = DateTime.now().millisecondsSinceEpoch.toString();

    if (token == null) return false;

    try {
      final res = await http.post(
        Uri.parse('$baseUrl/api/doc/apply'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'table': 'messages',
          'id': msgId,
          'ops': [
            {
              'op': 'set',
              'value': {
                'chat_id': chatId,
                'user_id': userId,
                'text': text,
                'type': 'text',
                'at': {'__ts__': DateTime.now().toIso8601String()}
              }
            }
          ]
        }),
      );

      return res.statusCode == 200;
    } catch (e) {
      print('Send message error: $e');
    }
    return false;
  }
}
