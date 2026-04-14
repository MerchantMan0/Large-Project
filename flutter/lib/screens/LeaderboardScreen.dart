import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../utils/GlobalData.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
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

class _MainPageState extends State<MainPage>
    with SingleTickerProviderStateMixin {
  final TextEditingController _searchController = TextEditingController();

  bool isLoadingChallenge = true;
  bool isLoadingLeaderboard = false;

  String message = '';
  String challengeId = '';
  String challengeTitle = 'Leaderboard';
  int? challengeWeek;

  String searchQuery = '';

  List<dynamic> gasItems = [];
  List<dynamic> memoryItems = [];
  List<dynamic> linesItems = [];

  int gasPage = 1;
  int memoryPage = 1;
  int linesPage = 1;

  final int pageSize = 20;

  int gasTotal = 0;
  int memoryTotal = 0;
  int linesTotal = 0;

  Timer? _searchDebounce;

  @override
  void initState() {
    super.initState();
    loadCurrentChallengeAndLeaderboards();
  }

  Future<void> loadCurrentChallengeAndLeaderboards() async {
    setState(() {
      isLoadingChallenge = true;
      message = '';
    });

    try {
      final challengeUri = Uri.parse('${GlobalData.apiURL}/challenges/current');
      final challengeResponse = await http.get(challengeUri);

      if (challengeResponse.statusCode != 200) {
        setState(() {
          message = 'Failed to load current challenge.';
          isLoadingChallenge = false;
        });
        return;
      }

      final challengeData = jsonDecode(challengeResponse.body);

      setState(() {
        challengeId = (challengeData['id'] ?? '').toString();
        challengeTitle =
            (challengeData['title'] ?? 'Current Challenge Leaderboard')
                .toString();
        challengeWeek = challengeData['week'];
      });

      await Future.wait([
        loadLeaderboard(metric: 'gas', page: gasPage),
        loadLeaderboard(metric: 'memory_bytes', page: memoryPage),
        loadLeaderboard(metric: 'lines', page: linesPage),
      ]);
    } catch (e) {
      setState(() {
        message = 'Could not connect to server.';
      });
    } finally {
      if (mounted) {
        setState(() {
          isLoadingChallenge = false;
        });
      }
    }
  }

  Future<void> loadLeaderboard({
    required String metric,
    required int page,
  }) async {
    if (challengeId.isEmpty) return;

    setState(() {
      isLoadingLeaderboard = true;
      message = '';
    });

    try {
      final uri = Uri.parse(
        '${GlobalData.apiURL}/challenges/$challengeId/leaderboard'
            '?metric=$metric&page=$page&page_size=$pageSize&search=${Uri.encodeQueryComponent(searchQuery)}',
      );

      final response = await http.get(uri);

      if (response.statusCode != 200) {
        setState(() {
          message = 'Failed to load leaderboard for $metric.';
        });
        return;
      }

      final data = jsonDecode(response.body);
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
    } catch (e) {
      setState(() {
        message = 'Could not load leaderboard data.';
      });
    } finally {
      if (mounted) {
        setState(() {
          isLoadingLeaderboard = false;
        });
      }
    }
  }

  int _totalPages(int total) {
    if (total <= 0) return 1;
    return ((total - 1) / pageSize).floor() + 1;
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
    required VoidCallback? onPrevious,
    required VoidCallback? onNext,
  }) {
    final totalPages = _totalPages(total);

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

  Widget _buildLeaderboardTab({
    required String metricKey,
    required List<dynamic> items,
    required int currentPage,
    required int total,
  }) {
    final totalPages = _totalPages(total);

    VoidCallback? onPrevious;
    VoidCallback? onNext;

    if (metricKey == 'gas') {
      if (gasPage > 1 && !isLoadingLeaderboard) {
        onPrevious = () => loadLeaderboard(metric: 'gas', page: gasPage - 1);
      }
      if (gasPage < totalPages && !isLoadingLeaderboard) {
        onNext = () => loadLeaderboard(metric: 'gas', page: gasPage + 1);
      }
    } else if (metricKey == 'memory_bytes') {
      if (memoryPage > 1 && !isLoadingLeaderboard) {
        onPrevious = () =>
            loadLeaderboard(metric: 'memory_bytes', page: memoryPage - 1);
      }
      if (memoryPage < totalPages && !isLoadingLeaderboard) {
        onNext = () =>
            loadLeaderboard(metric: 'memory_bytes', page: memoryPage + 1);
      }
    } else if (metricKey == 'lines') {
      if (linesPage > 1 && !isLoadingLeaderboard) {
        onPrevious = () => loadLeaderboard(metric: 'lines', page: linesPage - 1);
      }
      if (linesPage < totalPages && !isLoadingLeaderboard) {
        onNext = () => loadLeaderboard(metric: 'lines', page: linesPage + 1);
      }
    }

    if (isLoadingChallenge) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: loadCurrentChallengeAndLeaderboards,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (items.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Text(
                searchQuery.isEmpty
                    ? 'No leaderboard entries found.'
                    : 'No users match your search.',
                style: const TextStyle(
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
              onPrevious: onPrevious,
              onNext: onNext,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTopBar() {
    return Container(
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
                  Navigator.pop(context);
                },
                icon: const Icon(Icons.arrow_back),
                label: const Text('Back to Menu'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFF475569)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _searchController,
            onChanged: (value) {
              _searchDebounce?.cancel();
              _searchDebounce = Timer(const Duration(milliseconds: 350), () async {
                if (!mounted) return;

                setState(() {
                  searchQuery = value.trim();
                  gasPage = 1;
                  memoryPage = 1;
                  linesPage = 1;
                });

                await Future.wait([
                  loadLeaderboard(metric: 'gas', page: 1),
                  loadLeaderboard(metric: 'memory_bytes', page: 1),
                  loadLeaderboard(metric: 'lines', page: 1),
                ]);
              });
            },
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.search, color: Colors.white70),
              hintText: 'Search by username or user id',
              hintStyle: const TextStyle(color: Colors.white38),
              filled: true,
              fillColor: const Color(0xFF0F172A),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: Color(0xFF334155)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: Color(0xFF60A5FA)),
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              challengeTitle,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
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
    );
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          _buildTopBar(),
          if (message.isNotEmpty)
            Container(
              width: double.infinity,
              color: const Color(0xFF1D4ED8),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Text(
                message,
                style: const TextStyle(color: Colors.white),
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
}