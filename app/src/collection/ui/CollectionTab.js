import { Linking, StyleSheet, View } from 'react-native';
import { SecondaryButton } from './base';
import { UpdateBanner } from './AppSheets';
import { AuthorBar } from './AuthorPage';
import { BackupNote } from './BackupNote';
import { CardWall } from './CardWall';
import { FetchHealth } from './FetchHealth';
import { Pane } from './Pane';
import { RediscoverCard } from './Phase2';
import { TagBrowser, TagPageBar } from './TagBrowser';

// The 收藏 tab: the wall with its banners, 所有標籤 and a 大標籤's page, and the
// 作者頁. Pages open over the wall, which stays mounted underneath so its scroll
// position and filter survive. State: useWallState (`w`); 批次選取: `sel`
// (useWallSelection). `update`: useAppUpdate. `on`: the handlers App.js owns —
// open / menu / retry a card, add, settings, login, retry all failed, triage,
// shuffle (翻翻), stream a tag or an author (串流), edit tags, leave the 作者頁.
export function CollectionTab({ w, sel, c, index, update, on }) {
  const { pageTag, authorPage } = w;
  const cardHandlers = {
    query: w.query,
    onQuery: w.setQuery,
    searching: w.searching,
    onSearching: w.setSearchOpen,
    onOpen: on.open,
    onMenu: on.menu,
    onRetry: on.retry,
  };
  return (
    <>
      <Pane hidden={w.browsing || !!authorPage}>
        <CardWall
          {...cardHandlers}
          onSelect={() => sel.start('home')}
          selection={sel.propsFor('home', w.visible)}
          posts={w.visible}
          total={c.posts.length}
          index={index}
          filter={w.filter}
          onFilter={w.setFilter}
          onAdd={on.add}
          onSettings={on.settings}
          onAllTags={() => w.setBrowsing(true)}
          onRefresh={w.pullRefresh}
          refreshing={w.refreshing}
          banner={
            <View style={styles.banners}>
              <FetchHealth posts={c.posts} onRetryAll={c.retryAllFailed} onLogin={on.login} />
              <BackupNote onSetup={on.settings} />
              <UpdateBanner release={update.update} onDownload={() => Linking.openURL(update.update.apkUrl)} onDismiss={update.dismiss} />
              <RediscoverCard pick={w.rediscover} onOpen={on.open} onShuffle={on.shuffle} onDismiss={w.hideRediscover} />
              {w.untagged > 0 && !w.filter.length && (
                <View style={styles.triageEntry}>
                  <SecondaryButton title={`整理未分類（${w.untagged} 篇）`} iconName="albums-outline" onPress={on.triage} />
                </View>
              )}
            </View>
          }
        />
      </Pane>
      {w.browsing && (
        <Pane hidden={!!authorPage}>
          {pageTag ? (
            <CardWall
              {...cardHandlers}
              key={pageTag.id}
              onSelect={() => sel.start(`tag:${pageTag.id}`)}
              selection={sel.propsFor(`tag:${pageTag.id}`, w.pagePosts)}
              posts={w.pagePosts}
              index={index}
              title={pageTag.name}
              kicker={null}
              onBack={() => w.setTagPage(null)}
              filter={[pageTag.id]}
              onFilter={(ids) => !ids.length && w.setTagChild(null)}
              onAdd={on.add}
              onSettings={on.settings}
              filterBar={
                <TagPageBar
                  tag={pageTag}
                  kids={index.children[pageTag.id] || []}
                  count={w.pagePosts.length}
                  child={w.tagChild}
                  onChild={w.setTagChild}
                  onStream={() => on.streamTag(pageTag.id)}
                />
              }
            />
          ) : (
            <TagBrowser
              summaries={w.summaries}
              untagged={w.untagged}
              onBack={() => w.setBrowsing(false)}
              onOpenTag={w.openTagPage}
              onTriage={on.triage}
              onEdit={on.editTags}
            />
          )}
        </Pane>
      )}
      {authorPage && (
        <CardWall
          {...cardHandlers}
          key={authorPage.handle}
          onSelect={() => sel.start(`author:${authorPage.handle}`)}
          selection={sel.propsFor(`author:${authorPage.handle}`, w.authorPosts)}
          posts={w.authorPosts}
          index={index}
          title={`@${authorPage.handle}`}
          compactTitle
          kicker="作者"
          onBack={on.leaveAuthor}
          backLabel="返回"
          filter={[]}
          onFilter={() => {}}
          emptyText={{ title: '這位作者沒有收藏了', body: '刪除的貼文可以在提示出現時按「復原」。', action: '返回' }}
          filterBar={<AuthorBar handle={authorPage.handle} summary={w.authorInfo} onStream={() => on.streamAuthor(authorPage.handle)} />}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  banners: { gap: 12 },
  triageEntry: { flexDirection: 'row' },
});
