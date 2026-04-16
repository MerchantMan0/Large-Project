import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../utils/GlobalData.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
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
  bool isLoadingChallenges = true;
  bool isLoadingLeaderboards = false;

  String message = '';

  List<dynamic> challenges = [];
  int challengePage = 1;
  final int challengePageSize = 15;
  int challengeTotal = 0;

  dynamic selectedChallenge;

  List<dynamic> gasItems = [];
  List<dynamic> memoryItems = [];
  List<dynamic> linesItems = [];

  int gasPage = 1;
  int memoryPage = 1;
  int linesPage = 1;
  final int leaderboardPageSize = 20;

  int gasTotal = 0;
  int memoryTotal = 0;
  int linesTotal = 0;

  @override
  void initState() {
    super.initState();
    loadChallenges(page: 1);
  }

  Map<String, String> _authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${GlobalData.token}',
    };
  }

  int _totalPages(int total, int pageSize) {
    if (total <= 0) return 1;
    return ((total - 1) / pageSize).floor() + 1;
  }

  Future<void> loadChallenges({required int page}) async {
    setState(() {
      isLoadingChallenges = true;
      message = '';
    });

    try {
      final uri = Uri.parse(
        '${GlobalData.apiURL}/challenges?page=$page&page_size=$challengePageSize',
      );

      final response = await http.get(
        uri,
        headers: _authHeaders(),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        setState(() {
          challenges = List<dynamic>.from(data['items'] ?? []);
          challengePage = data['page'] ?? page;
          challengeTotal = data['total'] ?? 0;
        });
      } else {
        setState(() {
          message = data['error'] ?? 'Failed to load challenge history.';
        });
      }
    } catch (e) {
      setState(() {
        message = 'Could not connect to server.';
      });
    } finally {
      if (mounted) {
        setState(() {
          isLoadingChallenges = false;
        });
      }
    }
  }

  Future<void> selectChallenge(dynamic challenge) async {
    setState(() {
      selectedChallenge = challenge;
      gasPage = 1;
      memoryPage = 1;
      linesPage = 1;
      gasItems = [];
      memoryItems = [];
      linesItems = [];
      gasTotal = 0;
      memoryTotal = 0;
      linesTotal = 0;
    });

    await Future.wait([
      loadLeaderboard(metric: 'gas', page: 1),
      loadLeaderboard(metric: 'memory_bytes', page: 1),
      loadLeaderboard(metric: 'lines', page: 1),
    ]);
  }

  Future<void> loadLeaderboard({
    required String metric,
    required int page,
  }) async {
    if (selectedChallenge == null) return;

    setState(() {
      isLoadingLeaderboards = true;
      message = '';
    });

    try {
      final challengeId = (selectedChallenge['id'] ?? '').toString();

      final uri = Uri.parse(
        '${GlobalData.apiURL}/challenges/$challengeId/leaderboard'
            '?metric=$metric&page=$page&page_size=$leaderboardPageSize',
      );

      final response = await http.get(uri);
      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        final items = List<dynamic>.from(data['items'] ?? []);
        final total = data['total'] ?? 0;
        final resolvedPage = data['page'] ?? page;

        setState(() {
          if (metric == 'gas') {
            gasItems = items;
            gasTotal = total;
            gasPage = resolvedPage;
          } else if (metric == 'memory_bytes') {
            memoryItems = items;
            memoryTotal = total;
            memoryPage = resolvedPage;
          } else if (metric == 'lines') {
            linesItems = items;
            linesTotal = total;
            linesPage = resolvedPage;
          }
        });
      } else {
        setState(() {
          message = data['error'] ?? 'Failed to load leaderboard.';
        });
      }
    } catch (e) {
      setState(() {
        message = 'Could not load leaderboard data.';
      });
    } finally {
      if (mounted) {
        setState(() {
          isLoadingLeaderboards = false;
        });
      }
    }
  }

  Widget _buildChallengeCard(dynamic challenge) {
    final title = (challenge['title'] ?? 'Untitled Challenge').toString();
    final week = challenge['week'];
    final status = (challenge['status'] ?? 'unknown').toString();
    final challengeId = (challenge['id'] ?? '').toString();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: ListTile(
        onTap: () {
          selectChallenge(challenge);
        },
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        title: Text(
          week != null ? 'Week $week - $title' : title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 17,
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(
            'Status: $status',
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 13,
              height: 1.4,
            ),
          ),
        ),
        trailing: const Icon(
          Icons.chevron_right,
          color: Colors.white70,
        ),
      ),
    );
  }

  Widget _buildLeaderboardCard(dynamic item, String metricKey) {
    final user = item['user'] ?? {};
    final metrics = item['metrics'] ?? {};

    String metricValue = '-';
    String metricLabel = 'Value';

    if (metricKey == 'gas') {
      metricValue = (metrics['gas'] ?? '-').toString();
      metricLabel = 'Gas';
    } else if (metricKey == 'memory_bytes') {
      metricValue = (metrics['memory_bytes'] ?? '-').toString();
      metricLabel = 'Memory';
    } else if (metricKey == 'lines') {
      metricValue = (metrics['lines'] ?? '-').toString();
      metricLabel = 'Lines';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFF2563EB),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '#${(item['rank'] ?? '-').toString()}',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              (user['display_name'] ?? 'Unknown User').toString(),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Text(
            '$metricLabel: $metricValue',
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 15,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPagination({
    required int currentPage,
    required int total,
    required int pageSize,
    required VoidCallback? onPrevious,
    required VoidCallback? onNext,
  }) {
    final totalPages = _totalPages(total, pageSize);

    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: onPrevious,
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
            onPressed: onNext,
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

  Widget _buildChallengeListView() {
    final totalPages = _totalPages(challengeTotal, challengePageSize);

    return RefreshIndicator(
      onRefresh: () => loadChallenges(page: challengePage),
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
                label: const Text('Back'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFF475569)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            'Challenge History',
            style: TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Select a challenge to view its leaderboard',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 20),
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
          if (isLoadingChallenges)
            const Padding(
              padding: EdgeInsets.only(top: 40),
              child: Center(
                child: CircularProgressIndicator(),
              ),
            )
          else if (challenges.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: const Text(
                'No challenges found.',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 15,
                ),
              ),
            )
          else ...[
              ...challenges.map(_buildChallengeCard),
              const SizedBox(height: 8),
              _buildPagination(
                currentPage: challengePage,
                total: challengeTotal,
                pageSize: challengePageSize,
                onPrevious: challengePage > 1 && !isLoadingChallenges
                    ? () => loadChallenges(page: challengePage - 1)
                    : null,
                onNext: challengePage < totalPages && !isLoadingChallenges
                    ? () => loadChallenges(page: challengePage + 1)
                    : null,
              ),
            ],
        ],
      ),
    );
  }

  Widget _buildLeaderboardTab({
    required String metricKey,
    required List<dynamic> items,
    required int currentPage,
    required int total,
  }) {
    if (selectedChallenge == null) {
      return const SizedBox();
    }

    final totalPages = _totalPages(total, leaderboardPageSize);

    VoidCallback? onPrevious;
    VoidCallback? onNext;

    if (metricKey == 'gas') {
      if (gasPage > 1 && !isLoadingLeaderboards) {
        onPrevious = () => loadLeaderboard(metric: 'gas', page: gasPage - 1);
      }
      if (gasPage < totalPages && !isLoadingLeaderboards) {
        onNext = () => loadLeaderboard(metric: 'gas', page: gasPage + 1);
      }
    } else if (metricKey == 'memory_bytes') {
      if (memoryPage > 1 && !isLoadingLeaderboards) {
        onPrevious = () =>
            loadLeaderboard(metric: 'memory_bytes', page: memoryPage - 1);
      }
      if (memoryPage < totalPages && !isLoadingLeaderboards) {
        onNext = () =>
            loadLeaderboard(metric: 'memory_bytes', page: memoryPage + 1);
      }
    } else if (metricKey == 'lines') {
      if (linesPage > 1 && !isLoadingLeaderboards) {
        onPrevious = () => loadLeaderboard(metric: 'lines', page: linesPage - 1);
      }
      if (linesPage < totalPages && !isLoadingLeaderboards) {
        onNext = () => loadLeaderboard(metric: 'lines', page: linesPage + 1);
      }
    }

    return RefreshIndicator(
      onRefresh: () async {
        await loadLeaderboard(metric: metricKey, page: currentPage);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
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
          if (isLoadingLeaderboards && items.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 40),
              child: Center(
                child: CircularProgressIndicator(),
              ),
            )
          else if (items.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: const Text(
                'No leaderboard entries found.',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 15,
                ),
              ),
            )
          else ...[
              ...items.map((item) => _buildLeaderboardCard(item, metricKey)),
              const SizedBox(height: 8),
              _buildPagination(
                currentPage: currentPage,
                total: total,
                pageSize: leaderboardPageSize,
                onPrevious: onPrevious,
                onNext: onNext,
              ),
            ],
        ],
      ),
    );
  }

  Widget _buildLeaderboardView() {
    final title =
    (selectedChallenge?['title'] ?? 'Challenge Leaderboard').toString();
    final week = selectedChallenge?['week'];

    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            decoration: const BoxDecoration(
              color: Color(0xFF111827),
              border: Border(
                bottom: BorderSide(color: Color(0xFF334155)),
              ),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: () {
                        setState(() {
                          selectedChallenge = null;
                          message = '';
                        });
                      },
                      icon: const Icon(Icons.arrow_back),
                      label: const Text('Back to History'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Color(0xFF475569)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    week != null ? 'Week $week - $title' : title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const TabBar(
                  indicatorColor: Colors.white,
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.white60,
                  tabs: [
                    Tab(
                      icon: Icon(Icons.bolt),
                      text: 'Gas',
                    ),
                    Tab(
                      icon: Icon(Icons.memory),
                      text: 'Memory',
                    ),
                    Tab(
                      icon: Icon(Icons.format_list_numbered),
                      text: 'Lines',
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                _buildLeaderboardTab(
                  metricKey: 'gas',
                  items: gasItems,
                  currentPage: gasPage,
                  total: gasTotal,
                ),
                _buildLeaderboardTab(
                  metricKey: 'memory_bytes',
                  items: memoryItems,
                  currentPage: memoryPage,
                  total: memoryTotal,
                ),
                _buildLeaderboardTab(
                  metricKey: 'lines',
                  items: linesItems,
                  currentPage: linesPage,
                  total: linesTotal,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return selectedChallenge == null
        ? _buildChallengeListView()
        : _buildLeaderboardView();
  }
}