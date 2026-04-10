+++
title = "딕셔너리와 맵, 해싱"
date = 2024-05-25
description = "딕셔너리와 해싱을 알아보고, 각 언어의 구현을 알아봅니다."

[taxonomies]
tags = ["data-structure", "hashing"]

[extra]
series = "CSED233: Data Structure"
series_path = "/blog/series-csed233/"
+++

본 글에서는 딕셔너리와 해싱을 알아보고, 각 언어의 구현을 알아보며 배운 내용을 체크해보려 합니다. 
> 이 내용은 포항공과대학교의 CSED 233의 내용을 기반으로 하며,  
> 수업에서 다루지 않은 내용은 인용문으로 표기하였거나 별도 명시하였으니 참고바랍니다.

## Dictionary ADT
딕셔너리는 추상 자료형<sub>Abstract Data Types</sub>의 일종으로, 특정 키에 대해 특정 원소가 매핑되는 짝의 집합으로 구성되어 있습니다.
* *구현마다 다르긴 합니다만* 대체로 중복키는 허용되지 않습니다.
> Map이라고도 불립니다. 다만 Map과 Dictionary를 다르게 정의하는 경우도 가끔 있습니다.

### Fundamental Operations
* x = (k : key, d : data)
* Insert(x, *D*) : 삽입 연산
* Delete(k, *D*) : 제거 연산 
* Search(k, *D*) : 조회<sub>Lookup</sub> 연산

> 딕셔너리는 무순사전<sub>Unordered Dictionary</sub>과 순서 사전<sub>Ordered Dictionary</sub>으로 구분됩니다.
> 무순사전은 요소를 임의의 순서로 집합에 추가하고, 순서사전은 요소를 key를 기준으로 하여 특정한 순서로 집합에 추가합니다. 많은 언어는 이 두 종류의 딕셔너리를 모두 구현체에 포함하고 있습니다.

## Dictionary Implementations
딕셔너리를 구현하는 방법은 리스트, 해싱, 트리 세가지로 나눌 수 있습니다.  
각각의 구현이 key를 찾는 방법과 시간 복잡도는 아래와 같습니다.
* **Unsorted List** : 리스트를 처음부터 끝까지 순회하며 key를 찾습니다 : $O(n)$
* **Sorted List** : 이진 탐색을 이용하여 key를 찾습니다 : $O(log\,n)$
* **Hash Table** : key의 해시값을 이용하여 데이터에 직접 접근합니다 : 최악 $O(n)$, 평균 $O(1)$
* **Binary Search Tree** : 이진 탐색 트리를 이용하여 key를 정렬한 다음 찾습니다 : 최악 $O(n)$, 평균 $O(log\,n)$
* **Self-Balanced Binary Search Tree** : AVL Tree나 Red-Black Tree 등으로 구현된 자기 균형 이진 탐색 트리에서는 : $O(log\,n)$

> Unsorted List는 Python의 `OrderedDict` 구현에 사용되고, (Doubled Linked List를 이용해 들어간 순으로 정렬됩니다.)  
> Binary Search Tree는 C++의 `map`, Rust의 `BTreeMap` 구현에 사용됩니다.  
> 이 글에서는 Hash Table 구현 위주로 설명하며, 다른 구현은 다루지 않습니다.

## Hashing
해싱을 이용해서 키를 해시 테이블의 특정 위치에 매핑합니다.

**생각해봐야 할 점**
* 어떤 해시 함수를 사용할 것인가?
* 충돌을 어떻게 해결할 것인가?
* 해시 테이블의 크기는 어떻게 할 것인가?
* 해시 테이블이 꽉 차면 어떻게 할 것인가?

## Hash Function
해시 함수는 충돌을 최소화하고, 계산이 빨리 끝나는 것이 좋은 해시함수가 됩니다. 해시 테이블의 사용에서 대부분의 경우 들어오는 키가 밀집되어<sub>highly clusted</sub> 있기 때문에, 이를 분산하는 것은 해시 함수의 중요한 역할입니다.

우선 해시 함수는 키가 정수가 아닌 경우 특정 정수로 변환하고, 정수를 해시 테이블의 범위의 맞는 수로 변환하여 분산시킵니다.

### Division
```cpp
int hash(int x) {
    return(x % M);
}
```
정수를 해시 테이블의 크기 M으로 나누면 해시된 값이 항상 해시 테이블 내부에 있음을 보장할 수 있습니다.

#### Choice of M
만약 Divisor M이 짝수 값이라면, Hash Table 상의 가능한 모든 해시값을 만들 수 없습니다. 따라서 짝수 값 M을 사용해서는 안됩니다.  
만약 m=6이고 들어오는 값이 모두 짝수일 때 : 
```
0 => 0
2 => 2
4 => 4
6 => 0
8 => 2...
```
홀수 M에서는 그런 문제가 덜 발생하나, 여전히 같은 문제로 해시 테이블이 낭비될 가능성이 있습니다.  
만약 m=9=3*3이고 들어오는 값이 모두 3의 배수일 때 :
```
3 => 3
6 => 6
9 => 0
12 => 3
15 => 6...
```

따라서, **작은 소인수가 없는** 임의의 수나 소수로 M을 선정하는 것이 가장 적합합니다.

예를 들면, 713=23 * 31은 들어오는 값이 23의 배수, 31의 배수가 아닌 경우 균일한 해시 값을 냅니다. 23의 배수, 31의 배수인 경우는 2의 배수, 3의 배수인 경우보다 훨씬 드문 경우이므로 나쁘지 않은 M 값이라고 할 수 있겠습니다.

### String Folding
```cpp
int hash(string x) {
    int i, sum;
    for(char c : x) {
        sum += (int)c;
    }
    return sum % M;
}
```
만약 들어오는 값이 정수가 아닌 문자열인 경우 문자열을 접어서<sub>Folding</sub> 특정 정수로 만들 수 있습니다.

### Mid-Square
키 값을 제곱하여 중간 자리 숫자만을 선택하여 해시 테이블의 인덱스로 사용하는 방식입니다. 제곱 결과는 키 값의 모든 자릿수의 영향을 받기 때문에, 키 값이 밀집되어 있더라도 분산된 해시 결과 값을 낼 확률이 높습니다.

십진수로 예를 들겠습니다. 4567을 제곱하면 20857489가 되는데, 이 중 중간 2자리인 `57`을 인덱스로 사용한다고 해봅시다. 이때 4568을 제곱하면 20866624가 되는데, 인덱스는 `66`이 됩니다. 키 값은 한 자리 차이이나 해시값은 전혀 다르게 나온 것을 알 수 있습니다.

보통은 2진수 값을 사용하기 때문에 중간 r비트를 추출하여 0~$2^r-1$ 사이의 값이 나오게 됩니다.

## Types of Hashing
### Static Hashing
정적 해싱<sub>Static Hashing</sub>은 해시 테이블의 크기를 고정하여 해싱하는 방법입니다. 충돌하는 키를 다루는 방법에 따라 다시 **Open Hashing**이나 **Closed Hashing**으로 나뉘게 됩니다.
데이터의 사이즈가 커질수록 성능이 크게 감소하는 단점이 있습니다.
#### Open Hashing
오픈 해싱 (Seperate Chaning이라고도 불림)은 충돌이 발생할 경우 연결 리스트 등을 이용해 여러 개의 키-데이터를 해시 테이블 인덱스 하나에 보관하는 방법입니다.  
충돌이 다수 발생하여 하나의 인덱스에 너무 많은 데이터가 보관될 경우 조회가 느려지게 됩니다.
#### Closed Hashing
폐쇄 해싱은 오픈 해싱과 다르게 충돌을 피하고 하나의 해시 테이블 인덱스에는 하나의 값만 보관하는 방법입니다. **Bucket Hashing**과 **Rehashing** 두가지 방법이 있습니다.

폐쇄해싱의 경우 충돌이 발생하면 데이터를 원래 있어야 할 곳이 아닌 다른 곳에 보관하기 때문에, 데이터를 삭제할 경우 삭제되었다는 흔적을 남겨주어야 충돌해서 다른 곳에 가버린 데이터를 검색할 수 있습니다.
##### Bucket Hashing
해시 테이블의 슬롯을 일정 크기의 버킷으로 나누어서 (즉, 하나의 해시 값에 여러 인덱스를 할당하여) 충돌이 발생하여도 다음 인덱스를 채우는 방법입니다. 이 방법을 사용하여도 버킷이 가득 차면 오버플로우가 발생하게 되는데, 슬롯이 가득 찬 인덱스를 검색하는 Overflow Bucket을 따로 만들어서 문제를 해결할 수 있습니다.

마찬가지로 충돌이 발생할 경우 점점 속도가 느려지며, 특히 Overflow Bucket은 $O(n)$으로 검색되기 때문에 오버플로우가 자주 발생할 경우 조회가 느려지게 됩니다.
##### Rehashing
충돌이 발생하면 다시 해싱하는 방법입니다. Open Addressing이라고도 불립니다. 원래 키 값에 Probe 함수의 값을 더해서 다른 인덱스를 만들어내게 됩니다.
* **Linear Probing**: 충돌이 발생할 때마다 키 값을 1씩 증가시킵니다. 이 경우 들어오는 키 값이 밀집되어 있는 경우 1차 군집화<sub>Primary Clustering</sub> 문제가 발생하여 비어있는 공간의 탐색에 시간이 오래 걸리게 됩니다. (5, 6, 7, 8 키가 이미 들어간 상태에서 4가 들어간다고 생각해보면 4, 5, 6, 7, 8, 9을 모두 해싱해보아야 빈 공간을 찾을 수 있을 것입니다.)  
* **Pseudo-Random Probing** : 충돌이 발생할 때 마다 키 값을 임의의 순열 값으로 증가시킵니다. 보통 Shift-Register Sequence가 사용되는데, 충돌이 발생할 때 마다 키 값을 Shift하고 (2배 하고) 특정 값과 XOR하는 방법입니다.
* **Quadratic Probing** : 임의의 다항식을 이용하여 키 값을 증가시킵니다. 보통 제곱 값을 이용해서 k+1, k+4, k+9... 순으로 찾게 됩니다.

**Secondary Clustering** : 2차 군집화는 **Pseudo-Random**이나 **Quadratic** 프로빙을 이용하더라도 초기 해시값이 같은 키의 경우 다음 해시값도 계속 일치하는 문제입니다. 이 경우 동일한 해시 값을 가진 키가 여러 번 들어오면 점점 조회가 느려지게 됩니다.
* **Double Hashing** : 이 경우 이중 해싱을 이용해서 문제를 해결합니다. 탐색을 위해 서로 다른 두개의 해시 함수를 이용하는 방법입니다.

### Dynamic Hashing
동적 해싱<sub>Dynamic Hashing</sub>은 데이터의 증가에 따라 해시 테이블의 크기를 늘려 해싱하는 방법입니다. *수업에서는 다루지 않았습니다.*
데이터 증감에 따라서 해시함수가 동적으로 변환되며, 해시테이블 버킷의 수가 고정되지 않고 필요할 때마다 늘거나 줄어듭니다.  
주로 다루는 데이터 크기가 매우 큰 DBMS에서 이런 방식을 사용합니다.

#### Extendible Hashing
확장성 해싱은 동적 해싱에서 가장 많이 사용하는 방법으로, 이중구조로 딕셔너리를 만드는 방법입니다. 키를 비트 스트링으로 변환하고, 비트 스트링의 처음 몇 비트를 디렉토리라는 배열의 인덱스로 사용합니다.
디렉토리는 다시 버킷들의 포인터를 가지는데, 이 버킷에 데이터를 저장합니다. 만약 버킷에 오버플로우가 발생하면 버킷을 분할하여 공간을 늘립니다.

데이터의 크기가 커지더라도 디스크 접근 횟수가 늘어나지 않으나, 데이터의 숫자가 적을 경우 오히려 비효율적이라는 단점이 있습니다.

## HashMap Implementation
각 언어의 해시맵 구현 방법을 알아보겠습니다. 마찬가지로 *수업에서는 다루지 않았습니다.*

### C++ : unordered_map
C++의 해시맵인 unordered_map은 우선 기본적인 Division Hashing을 이용하여 Linked List 버킷에 데이터를 저장합니다. 이때 `load_factor`라는 값이 변경되는데, 이는 `입력된 데이터의 개수 / 버킷의 총 개수`를 의미합니다.

만약 이 `load_factor`가 `max_load_factor` (기본적으로 1.0)를 넘어서면 전체 버킷의 개수를 증가시키고, 전체 데이터를 새로운 `bucket_count`로 재해싱합니다. 

이때 어떤 값으로 `bucket_count`를 증가시킬지는 Undefined Behavior입니다. 각 컴파일러마다 다른 값을 사용하는데, GCC와 Clang은 소수를, MSVC는 2의 제곱에서 1을 뺀 값을 이용한다고 합니다.

아래 프로그램을 통해 대략적인 구조를 확인해볼 수 있습니다.

```cpp
int main() {
        unordered_map<int, int> map;
        std::cout << map.bucket_count() << std::endl;
        for(int i = 30; i > 0; i--) {
                map.insert(make_pair(i, 1));
                std::cout << map.bucket_count() << std::endl;
                for(auto& x : map) {
                        cout << "(" << x.first << ", " << x.second << ")";
                        cout << " is in bucket= " << map.bucket(x.first) << endl;
                }
        }

}
```

모듈로 연산만을 이용하기 때문에, C++의 unordered_map은 [저격 데이터를 만들기가 쉽다는 문제가 있습니다.](https://codingdog.tistory.com/entry/c-unorderedmap-%EC%96%B4%EB%96%BB%EA%B2%8C-%EC%B5%9C%EC%95%85%EC%9D%98-%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%A5%BC-%EB%A7%8C%EB%93%A4%EA%B9%8C)

### Python : Dictionary
파이썬은 딕셔너리가 표준 라이브러리가 아닌 언어의 기본 기능으로 내장되어 있는데, Rehashing, 그중에서도 Linear Probing을 기본적으로 사용하고, 그 외에는 C++의 구현과 비슷하게 load_factor를 이용하여 일정 수준 이상일 경우 해시테이블의 크기를 증가시킵니다.  
다만 Linear Probing은 Primary Clustrering에 매우 취약하기 때문에, 기본 load_factor가 1.0인 C++과 다르게 0.75를 기본 값으로 사용한다고 합니다.

앞서 C++은 저격 데이터를 만들기가 상당히 쉽다고 말했는데, 이렇게 저격 데이터를 만들어서 해시맵의 용량과 CPU 사용량을 늘리는 것을 HashDoS 공격이라고 합니다. HashDoS 공격을 당한 서버는 갑자기 프로세서 사용량이 폭증하여 요청을 정상적으로 처리할 수 없게 됩니다.

따라서 Python은 3.4 정도 버전부터 HashDoS 공격을 방어하기 위해 [SipHash](https://en.wikipedia.org/wiki/SipHash) 알고리즘을 이용합니다. 자세한 내용은 여기서 설명하지 않겠지만, 임의의 난수를 통해 데이터를 해싱하여 임의로 해시값을 중복시키는 것을 어렵게 만드는 알고리즘입니다. Pseudo-Random Hashing의 일종으로 보면 될 것 같습니다.

### Rust : HashMap
Rust도 기본적으로 [SipHash](https://en.wikipedia.org/wiki/SipHash) 알고리즘을 이용합니다. 

해시 테이블의 구현은 [SwissTable](https://abseil.io/about/design/swisstables)의 Rust 포팅 버전을 이용하는데, 마찬가지로 많이 복잡하여 자세한 내용은 설명하지 않지만, SIMD를 활용하여 최적화한 Open Addressing 해시 테이블이라고 생각하면 될 듯 합니다.

## Reference
* POSTECH: [CSED 233 Data Structure](https://plms.postech.ac.kr/local/ubion/course/syllabusV.php?id=9392)
* [https://skyil.tistory.com/117](https://skyil.tistory.com/117)
* [https://stackoverflow.com/questions/34496582/is-ordereddict-a-tree](https://stackoverflow.com/questions/34496582/is-ordereddict-a-tree)
* [https://stackoverflow.com/questions/9456790/why-are-composite-numbers-bad-for-hashing-by-division](https://stackoverflow.com/questions/9456790/why-are-composite-numbers-bad-for-hashing-by-division)
* [https://m.blog.naver.com/beaqon/221300416700](https://m.blog.naver.com/beaqon/221300416700)
* [https://growth-coder.tistory.com/16](https://growth-coder.tistory.com/16)
* [https://stackoverflow.com/questions/31112852/how-stdunordered-map-is-implemented](https://stackoverflow.com/questions/31112852/how-stdunordered-map-is-implemented)
* [https://charsyam.wordpress.com/2018/02/04/%EC%9E%85-%EA%B0%9C%EB%B0%9C-siphash%EC%9D%98-%EC%82%AC%EC%9A%A9-data-ddos%EB%A5%BC-%EB%B0%A9%EC%A7%80%ED%95%B4%EB%B3%BC%EA%B9%8C/](https://charsyam.wordpress.com/2018/02/04/%EC%9E%85-%EA%B0%9C%EB%B0%9C-siphash%EC%9D%98-%EC%82%AC%EC%9A%A9-data-ddos%EB%A5%BC-%EB%B0%A9%EC%A7%80%ED%95%B4%EB%B3%BC%EA%B9%8C/)
* [https://doc.rust-lang.org/std/collections/struct.HashMap.html](https://doc.rust-lang.org/std/collections/struct.HashMap.html)
* [https://faultlore.com/blah/hashbrown-tldr/](https://faultlore.com/blah/hashbrown-tldr/)
