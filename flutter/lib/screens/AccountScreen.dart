import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../utils/GlobalData.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFF0F172A),
      body: SafeArea(
        child: MainPage(),
      ),
    );
  }
}

class MainPage extends StatefulWidget {
  const MainPage({super.key});

  @override
  State<MainPage> createState() => _MainPageState();
}

class _MainPageState extends State<MainPage> {
  bool isLoadingProfile = true;
  bool isLoadingSubmissions = false;

  String message = '';

  String userId = '';
  String displayName = 'Loading...';
  int totalSubmissions = 0;
  int acceptedSubmissions = 0;
  int challengesSolved = 0;

  int currentPage = 1;
  final int pageSize = 10;
  int totalSubmissionCount = 0;

  List<dynamic> submissions = [];

  @override
  void initState() {
    super.initState();
    loadAccountData();
  }

  Map<String, String> _authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${GlobalData.token}',
    };
  }

  Future<void> loadAccountData() async {
    setState(() {
      isLoadingProfile = true;
      message = '';
    });

    try {
      final profileUri = Uri.parse('${GlobalData.apiURL}/users/me');

      final profileResponse = await http.get(
        profileUri,
        headers: _authHeaders(),
      );

      final profileData = jsonDecode(profileResponse.body);

      if (profileResponse.statusCode != 200) {
        setState(() {
          message = profileData['error'] ?? 'Failed to load account.';
          isLoadingProfile = false;
        });
        return;
      }

      setState(() {
        userId = (profileData['id'] ?? '').toString();
        displayName = (profileData['display_name'] ?? 'Unknown User').toString();

        final stats = profileData['stats'] ?? {};
        totalSubmissions = stats['submissions'] ?? 0;
        acceptedSubmissions = stats['accepted'] ?? 0;
        challengesSolved = stats['challenges_solved'] ?? 0;
      });

      await loadSubmissions(page: 1);
    } catch (e) {
      setState(() {
        message = 'Could not connect to server.';
        isLoadingProfile = false;
      });
    }
  }

  Future<void> loadSubmissions({required int page}) async {
    if (userId.isEmpty) {
      setState(() {
        isLoadingProfile = false;
        message = 'User id not found.';
      });
      return;
    }

    setState(() {
      isLoadingSubmissions = true;
      message = '';
    });

    try {
      final submissionsUri = Uri.parse(
        '${GlobalData.apiURL}/users/$userId/submissions?page=$page&page_size=$pageSize',
      );

      final response = await http.get(
        submissionsUri,
        headers: _authHeaders(),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        setState(() {
          submissions = List<dynamic>.from(data['items'] ?? []);
          currentPage = data['page'] ?? page;
          totalSubmissionCount = data['total'] ?? submissions.length;
        });
      } else {
        setState(() {
          message = data['error'] ?? 'Failed to load submissions.';
        });
      }
    } catch (e) {
      setState(() {
        message = 'Could not load submissions.';
      });
    } finally {
      if (mounted) {
        setState(() {
          isLoadingProfile = false;
          isLoadingSubmissions = false;
        });
      }
    }
  }

  int get totalPages {
    if (totalSubmissionCount == 0) return 1;
    return ((totalSubmissionCount - 1) / pageSize).floor() + 1;
  }

  Widget _buildStatCard(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        decoration: BoxDecoration(
          color: const Color(0xFF111827),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF334155)),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String raw) {
    if (raw.isEmpty) return 'Unknown date';
    try {
      final parsed = DateTime.parse(raw).toLocal();
      return '${parsed.month}/${parsed.day}/${parsed.year} '
          '${parsed.hour.toString().padLeft(2, '0')}:'
          '${parsed.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return raw;
    }
  }

  Widget _chip(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Text(
        '$label: $value',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _buildSubmissionCard(dynamic submission) {
    final metrics = submission['metrics'] ?? {};

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            (submission['challenge_id'] ?? 'Unknown Challenge').toString(),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 17,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _chip('Status', (submission['status'] ?? 'unknown').toString()),
              _chip('Gas', (metrics['gas'] ?? '-').toString()),
              _chip('Memory', (metrics['memory_bytes'] ?? '-').toString()),
              _chip('Lines', (metrics['lines'] ?? '-').toString()),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Submitted: ${_formatDate((submission['submitted_at'] ?? '').toString())}',
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Submission ID: ${(submission['id'] ?? '').toString()}',
            style: const TextStyle(
              color: Colors.white54,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPagination() {
    final canGoBack = currentPage > 1;
    final canGoForward = currentPage < totalPages;

    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: canGoBack && !isLoadingSubmissions
                ? () => loadSubmissions(page: currentPage - 1)
                : null,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(color: Color(0xFF475569)),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: const Text('Previous'),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'Page $currentPage / $totalPages',
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
        ),
        Expanded(
          child: OutlinedButton(
            onPressed: canGoForward && !isLoadingSubmissions
                ? () => loadSubmissions(page: currentPage + 1)
                : null,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(color: Color(0xFF475569)),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: const Text('Next'),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: loadAccountData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                },
                icon: const Icon(Icons.arrow_back),
                label: const Text('Back to Menu'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFF475569)),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const Spacer(),
              OutlinedButton.icon(
                onPressed: () {
                  GlobalData.token = '';
                  Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
                },
                icon: const Icon(Icons.logout),
                label: const Text('Logout'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFF475569)),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF111827),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              children: [
                const CircleAvatar(
                  radius: 32,
                  backgroundColor: Color(0xFF2563EB),
                  child: Icon(
                    Icons.person,
                    color: Colors.white,
                    size: 34,
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  displayName,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  userId.isEmpty ? 'Loading user id...' : 'User ID: $userId',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (message.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF1D4ED8),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                message,
                style: const TextStyle(color: Colors.white),
              ),
            ),
          Row(
            children: [
              _buildStatCard('Submissions', totalSubmissions.toString()),
              const SizedBox(width: 12),
              _buildStatCard('Accepted', acceptedSubmissions.toString()),
              const SizedBox(width: 12),
              _buildStatCard('Solved', challengesSolved.toString()),
            ],
          ),
          const SizedBox(height: 20),
          const Text(
            'Previous Submissions',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          if (isLoadingProfile)
            const Padding(
              padding: EdgeInsets.only(top: 32),
              child: Center(
                child: CircularProgressIndicator(),
              ),
            )
          else if (submissions.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: const Text(
                'No submissions found.',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 15,
                ),
              ),
            )
          else ...[
              ...submissions.map(_buildSubmissionCard),
              const SizedBox(height: 8),
              _buildPagination(),
            ],
        ],
      ),
    );
  }
}