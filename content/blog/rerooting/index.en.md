+++
title = "Tree Rerooting (All-Direction Tree DP)"
date = 2024-04-12
description = "Solving tree DP problems using the rerooting technique"

[taxonomies]
tags = ["algorithm", "tree", "DP"]
+++

I looked into Tree DP — specifically All-Direction Tree (全方位木) DP — after seeing it used in [AtCoder ABC #348](https://atcoder.jp/contests/abc348)'s [E - Minimize Sum of Distance](https://atcoder.jp/contests/abc348/tasks/abc348_e).

This algorithm is called **Rerooting** outside of Japan, and is a useful technique for finding the optimal root in an unrooted tree. In Korea it's treated as a subcategory of dynamic programming on trees, but abroad it seems to appear frequently enough in competitive programming to have its own name.

## Concept
### Tree DFS
First, let's think about how to find the **total edge cost to all other nodes** from a specific node. This can be implemented in $O(n)$ using DFS+DP.
![IMG_0140](IMG_0140.png "IMG_0140")

### Rerooting
So how can we find the node with the **smallest total edge cost to all other nodes**? We could use the tree DFS described above for each node, but that would take $O(n^2)$ and would time out once the number of vertices exceeds $10^5$.  
This is exactly when we use the **rerooting technique**. It exploits the fact that moving the root of a DFS+DP tree can be done in $O(1)$.

In the figure above, let's calculate B's total distance sum using A's total distance sum of 30. The distances from A and the nodes beyond it — A(0), C(3), F(7) — increase by the cost of the A-B edge (5), becoming A(5), C(8), F(12). The distances from B and the nodes below it — B(5), D(8), E(7) — decrease by the A-B edge cost (5), becoming B(0), D(3), E(2). Since A's increase and B's decrease cancel out:  
`(A's total distance) - {(nodes beyond A) - (nodes below B)} * (A-B edge cost)}` gives us B's total distance sum.

![IMG_0141](IMG_0141.png "IMG_0141")

Using this method, when we know A's total distance sum, we can compute B's total distance sum in $O(1)$.  
If you think of this as moving the root, it's the rerooting technique; if you think of it as running DFS searching in both directions, it's called all-direction tree DP. As with most algorithms, the name doesn't really matter.

The number of nodes beyond A and below B can be obtained by **storing the count of subnodes** during the initial DFS that computes A's total distance sum. In the example above, `A's subnode count` - `B's subnode count` gives the number of nodes beyond A, and `B's subnode count` directly gives the number of nodes below B.

## Examples

### [BOJ 27730 : Gyeonwoo and Jiknyeo](https://www.acmicpc.net/problem/27730)

A problem where the above example can be applied directly. Run it on two trees and output the node with the smallest distance sum from both sides.
 
### [BOJ 7812 : Central Tree](https://www.acmicpc.net/problem/7812)

Find the central node using rerooting, then run DFS again to output distances from all nodes.


### [ABC#348 E](https://atcoder.jp/contests/abc348/tasks/abc348_e)

This is the problem where I first learned about the rerooting technique. Instead of edge costs, **vertex costs** are given.
That is, `(number of edges needed to reach a vertex) * (vertex cost)` becomes the edge cost.  
This problem can be solved by keeping track of both the vertex cost sum `c[x]` and the distance sum `c[x]*d`.
The solution code is below, and please refer to the [editorial](https://atcoder.jp/contests/abc348/editorial/9774) for the explanation.

```cpp
#include <bits/stdc++.h>
using namespace std;
#define llint long long int
int main() {
    int n;
    cin >> n;
    vector<int> a(n - 1), b(n - 1);
    vector<vector<int>> tree(n);
    for (int i = 0; i < n - 1; i++) {
        cin >> a[i] >> b[i];
        a[i] -= 1;
        b[i] -= 1;
        tree[a[i]].push_back(b[i]);
        tree[b[i]].push_back(a[i]);
    }

    vector<llint> c(n);
    for (int i = 0; i < n; i++)
        cin >> c[i];

    vector<llint> sub_sum_c(n), sub_sum_d(n);
    auto dfs
    =[&](auto &&self, int v, int par) -> pair<llint, llint> {
        for (int t: tree[v]) {
            if (t == par) continue;
            auto [child_sum_c, child_sum_d] = self(self, t, v);
            sub_sum_c[v] += child_sum_c;
            sub_sum_d[v] += child_sum_d;
        }
        sub_sum_d[v] += sub_sum_c[v];
        sub_sum_c[v] += c[v];
        return {sub_sum_c[v], sub_sum_d[v]};
    }; dfs(dfs, 0, -1);

    vector<llint> f(n);
    auto reroot
    =[&](auto &&self, int v, int par, llint par_sum_c, llint par_sum_d) -> void {
        f[v] = sub_sum_d[v] + par_sum_d;
        for(int t : tree[v]) {
            if(t == par) continue;
            llint nc = par_sum_c
                    + sub_sum_c[v]
                    - sub_sum_c[t];
            llint nd = par_sum_d
                    + sub_sum_d[v]
                    - sub_sum_d[t] - sub_sum_c[t]
                    + nc;
            self(self, t, v, nc, nd);
        }
    }; reroot(reroot, 0, -1, 0, 0);

    cout << *min_element(f.begin(), f.end()) << endl;
}
```

## See Also
* [Codeforces - Rerooting Technique](https://codeforces.com/topic/76681/en17)
* [nicotina04 - Rerooting Technique on Tree](https://nicotina04.tistory.com/169)
* [Codeforces - Online Query Based Rerooting Technique](https://codeforces.com/blog/entry/76150)
