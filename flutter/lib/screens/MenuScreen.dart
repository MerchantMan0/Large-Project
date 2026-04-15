import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_code_editor/flutter_code_editor.dart';
import 'package:highlight/languages/lua.dart';
import '../utils/GlobalData.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
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
  final CodeController _codeController = CodeController(
    text: '''-- Write your Lua solution here''',
    language: lua,
  )..popupController.enabled = false;

  bool isLoadingChallenge = true;
  bool isSubmitting = false;
  bool isRunningCode = false;

  String message = '';
  String challengeId = '';
  String challengeTitle = 'Loading challenge...';
  String challengeDescription = '';
  int? challengeWeek;
  String challengeStatus = '';
  int? timeoutMs;
  String opensAt = '';
  String closesAt = '';

  String runOutput = 'Press "Run Code" to see the API response here.';

  @override
  void initState() {
    super.initState();
    loadCurrentChallenge();
  }

  Future<void> loadCurrentChallenge() async {
    setState(() {
      isLoadingChallenge = true;
      message = '';
    });

    try {
      final uri = Uri.parse('${GlobalData.apiURL}/challenges/current');
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        setState(() {
          challengeId = (data['id'] ?? '').toString();
          challengeTitle = (data['title'] ?? 'Untitled Challenge').toString();
          challengeDescription =
              (data['description'] ?? 'No problem statement available.')
                  .toString();
          challengeWeek = data['week'];
          challengeStatus = (data['status'] ?? '').toString();
          timeoutMs = data['timeout_ms'];
          opensAt = (data['opens_at'] ?? '').toString();
          closesAt = (data['closes_at'] ?? '').toString();
        });
      } else {
        setState(() {
          message = 'Failed to load challenge (${response.statusCode}).';
        });
      }
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

  Future<void> _pollAndUpdateOutput(String submissionId) async {
    Map<String, dynamic> detailsData = {};
    bool finished = false;

    for (int i = 0; i < 10; i++) {
      await Future.delayed(const Duration(milliseconds: 700));

      if (!mounted) return;

      final detailsUri = Uri.parse(
        '${GlobalData.apiURL}/submissions/$submissionId',
      );

      final detailsResponse = await http.get(
        detailsUri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${GlobalData.token}',
        },
      );

      print(detailsResponse.statusCode);
      print(detailsResponse.body);

      if (detailsResponse.statusCode != 200) {
        if (mounted) {
          setState(() {
            runOutput = detailsResponse.body;
          });
        }
        return;
      }

      detailsData = jsonDecode(detailsResponse.body);

      final status = (detailsData['status'] ?? '').toString().toLowerCase();
      final consoleLines = (detailsData['console'] as List? ?? [])
          .map((line) => line.toString())
          .toList();

      if (consoleLines.isNotEmpty ||
          status == 'accepted' ||
          status == 'finished' ||
          status == 'completed' ||
          status == 'failed' ||
          status == 'rejected' ||
          status == 'error') {
        finished = true;
        break;
      }
    }

    final consoleLines = (detailsData['console'] as List? ?? [])
        .map((line) => line.toString())
        .toList();

    if (mounted) {
      setState(() {
        if (consoleLines.isNotEmpty) {
          runOutput = consoleLines.join('\n');
        } else if (finished) {
          runOutput = 'No output.';
        } else {
          runOutput = 'Still processing. Try again in a moment.';
        }
      });
    }
  }

  Future<void> submitLuaCode() async {
    if (challengeId.isEmpty) {
      setState(() {
        message = 'No challenge loaded yet.';
      });
      return;
    }

    if (_codeController.text.trim().isEmpty) {
      setState(() {
        message = 'Please enter some Lua code before submitting.';
      });
      return;
    }

    setState(() {
      isSubmitting = true;
      message = '';
    });

    try {
      final uri = Uri.parse(
        '${GlobalData.apiURL}/challenges/$challengeId/submissions',
      );

      final response = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${GlobalData.token}',
        },
        body: jsonEncode({
          'language': 'lua',
          'source': _codeController.text,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final submissionId = (data['id'] ?? '').toString();
        setState(() {
          message =
              'Submission successful! Submission ID: ${data['id'] ?? 'unknown'}';
          runOutput = 'Running...';
        });
        if (submissionId.isNotEmpty) {
          _pollAndUpdateOutput(submissionId);
        }
      } else {
        setState(() {
          message = data['error'] ?? 'Submission failed.';
        });
      }
    } catch (e) {
      setState(() {
        message = 'Could not submit code.';
      });
    } finally {
      if (mounted) {
        setState(() {
          isSubmitting = false;
        });
      }
    }
  }

  Future<void> runLuaCode() async {
    if (challengeId.isEmpty) {
      setState(() {
        runOutput = 'No challenge loaded yet.';
      });
      return;
    }

    if (_codeController.text.trim().isEmpty) {
      setState(() {
        runOutput = 'Please enter some Lua code before running.';
      });
      return;
    }

    setState(() {
      isRunningCode = true;
      runOutput = 'Running code...';
    });

    try {
      final submitUri = Uri.parse(
        '${GlobalData.apiURL}/challenges/$challengeId/submissions',
      );

      final submitResponse = await http.post(
        submitUri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${GlobalData.token}',
        },
        body: jsonEncode({
          'language': 'lua',
          'source': _codeController.text,
        }),
      );

      print(submitResponse.statusCode);
      print(submitResponse.body);

      if (submitResponse.statusCode != 200 &&
          submitResponse.statusCode != 201) {
        setState(() {
          runOutput = submitResponse.body;
        });
        return;
      }

      final submitData = jsonDecode(submitResponse.body);
      final submissionId = (submitData['id'] ?? '').toString();

      if (submissionId.isEmpty) {
        setState(() {
          runOutput = 'No submission id returned.';
        });
        return;
      }

      await _pollAndUpdateOutput(submissionId);
    } catch (e) {
      setState(() {
        runOutput = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          isRunningCode = false;
        });
      }
    }
  }

  Widget _buildInfoChip(String label, String value) {
    return Container(
      margin: const EdgeInsets.only(right: 8, bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Text(
        '$label: $value',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 13,
        ),
      ),
    );
  }

  Widget _buildProblemTab() {
    if (isLoadingChallenge) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    return RefreshIndicator(
      onRefresh: loadCurrentChallenge,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            challengeTitle,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            children: [
              if (challengeWeek != null)
                _buildInfoChip('Week', challengeWeek.toString()),
              if (challengeStatus.isNotEmpty)
                _buildInfoChip('Status', challengeStatus),
              if (timeoutMs != null)
                _buildInfoChip('Timeout', '${timeoutMs} ms'),
            ],
          ),
          if (opensAt.isNotEmpty || closesAt.isNotEmpty) ...[
            const SizedBox(height: 8),
            if (opensAt.isNotEmpty)
              Text(
                'Opens: $opensAt',
                style: const TextStyle(color: Colors.white70, fontSize: 14),
              ),
            if (closesAt.isNotEmpty)
              Text(
                'Closes: $closesAt',
                style: const TextStyle(color: Colors.white70, fontSize: 14),
              ),
          ],
          const SizedBox(height: 20),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF111827),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Text(
              challengeDescription.isEmpty
                  ? 'No problem statement available.'
                  : challengeDescription,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: loadCurrentChallenge,
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh Challenge'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(color: Color(0xFF475569)),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEditorTab() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFF020617),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: CodeTheme(
                  data: CodeThemeData(styles: {}),
                  child: CodeField(
                    controller: _codeController,
                    gutterStyle: GutterStyle.none,
                    textStyle: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontFamily: 'monospace',
                      height: 1.5,
                    ),
                    decoration: const BoxDecoration(
                      color: Color(0xFF020617),
                    ),
                    expands: true,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    _codeController.text = '''''';
                    setState(() {});
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFF475569)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('Reset'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: isSubmitting ? null : submitLuaCode,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: isSubmitting
                      ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                      : const Text('Submit'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOutputTab() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Expanded(
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF020617),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: SingleChildScrollView(
                child: SelectableText(
                  runOutput,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontFamily: 'monospace',
                    height: 1.5,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: isRunningCode ? null : runLuaCode,
              icon: isRunningCode
                  ? const SizedBox(
                height: 18,
                width: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
                  : const Icon(Icons.play_arrow),
              label: Text(isRunningCode ? 'Running...' : 'Run Code'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF16A34A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
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
                  Navigator.pushNamed(context, '/leaderboard');
                },
                icon: const Icon(Icons.leaderboard),
                label: const Text('Leaderboards'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFF475569)),
                ),
              ),
              const Spacer(),
              OutlinedButton.icon(
                onPressed: () {
                  Navigator.pushNamed(context, '/account');
                },
                icon: const Icon(Icons.person),
                label: const Text('Account'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFF475569)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const TabBar(
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white60,
            tabs: [
              Tab(
                icon: Icon(Icons.description_outlined),
                text: 'Problem',
              ),
              Tab(
                icon: Icon(Icons.terminal),
                text: 'Editor',
              ),
              Tab(
                icon: Icon(Icons.play_circle_outline),
                text: 'Output',
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _codeController.dispose();
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
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      message,
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                  IconButton(
                    onPressed: () {
                      setState(() {
                        message = '';
                      });
                    },
                    icon: const Icon(Icons.close, color: Colors.white),
                    tooltip: 'Dismiss',
                  ),
                ],
              ),
            ),
          Expanded(
            child: TabBarView(
              children: [
                _buildProblemTab(),
                _buildEditorTab(),
                _buildOutputTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}