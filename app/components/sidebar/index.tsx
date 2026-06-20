import React, { useEffect, useRef, useState } from 'react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChatBubbleOvalLeftEllipsisIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { ChatBubbleOvalLeftEllipsisIcon as ChatBubbleOvalLeftEllipsisSolidIcon } from '@heroicons/react/24/solid'
import Button from '@/app/components/base/button'
// import Card from './card'
import type { ConversationItem } from '@/types/app'

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

const MAX_CONVERSATION_LENTH = 20

export interface ISidebarProps {
  copyRight: string
  currentId: string
  onCurrentIdChange: (id: string) => void
  onDeleteConversation: (id: string) => Promise<void>
  list: ConversationItem[]
}

const Sidebar: FC<ISidebarProps> = ({
  copyRight,
  currentId,
  onCurrentIdChange,
  onDeleteConversation,
  list,
}) => {
  const { t } = useTranslation()
  const [menuId, setMenuId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ConversationItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node))
      { setMenuId('') }
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  const confirmDelete = async () => {
    if (!deleteTarget || deleting)
    { return }
    setDeleting(true)
    try {
      await onDeleteConversation(deleteTarget.id)
      setDeleteTarget(null)
      setMenuId('')
    }
    finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="chat-conversation-sidebar flex h-full shrink-0 flex-col overflow-y-auto border-r border-[#183129]/[0.07] bg-[#f7f7f2] pc:w-[236px] tablet:w-[210px] mobile:w-[260px]"
    >
      {list.length < MAX_CONVERSATION_LENTH && (
        <div className="flex flex-shrink-0 p-4 !pb-0">
          <Button
            onClick={() => { onCurrentIdChange('-1') }}
            className="group block w-full flex-shrink-0 !justify-start !h-9 !rounded-xl !border-0 !bg-[#17342b] !text-white items-center text-sm"
          >
            <PencilSquareIcon className="mr-2 h-4 w-4" /> {t('app.chat.newChat')}
          </Button>
        </div>
      )}

      <nav className="chat-conversation-list mt-4 flex-1 space-y-1 bg-white p-4 !pt-0">
        {list.map((item) => {
          const isCurrent = item.id === currentId
          const ItemIcon
            = isCurrent ? ChatBubbleOvalLeftEllipsisSolidIcon : ChatBubbleOvalLeftEllipsisIcon
          return (
            <div
              onClick={() => onCurrentIdChange(item.id)}
              key={item.id}
              className={classNames(
                isCurrent
                  ? 'chat-conversation-active bg-[#e4eee6] text-[#285440]'
                  : 'chat-conversation-item text-gray-700 hover:bg-[#eceee9] hover:text-gray-700',
                'group relative flex items-center rounded-xl px-2.5 py-2.5 text-xs font-medium cursor-pointer',
              )}
            >
              <ItemIcon
                className={classNames(
                  isCurrent
                    ? 'text-[#396b53]'
                    : 'text-gray-400 group-hover:text-gray-500',
                  'mr-3 h-5 w-5 flex-shrink-0',
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate pr-1">{item.name}</span>
              {item.id !== '-1' && (
                <div ref={menuId === item.id ? menuRef : undefined} className="relative">
                  <button
                    type="button"
                    aria-label={`管理对话：${item.name}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      setMenuId(current => current === item.id ? '' : item.id)
                    }}
                    className="grid h-7 w-7 place-items-center rounded-lg text-gray-400 opacity-0 transition hover:bg-black/[0.06] hover:text-gray-700 group-hover:opacity-100 focus:opacity-100"
                  >
                    <EllipsisHorizontalIcon className="h-4 w-4" />
                  </button>
                  {menuId === item.id && (
                    <div className="absolute right-0 top-8 z-30 w-28 rounded-xl border border-black/10 bg-white p-1.5 shadow-xl">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setDeleteTarget(item)
                          setMenuId('')
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                        删除
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      {/* <a className="flex flex-shrink-0 p-4" href="https://langgenius.ai/" target="_blank">
        <Card><div className="flex flex-row items-center"><ChatBubbleOvalLeftEllipsisSolidIcon className="text-primary-600 h-6 w-6 mr-2" /><span>LangGenius</span></div></Card>
      </a> */}
      <div className="flex flex-shrink-0 pr-4 pb-4 pl-4">
        <div className="text-gray-400 font-normal text-xs">© {copyRight} {(new Date()).getFullYear()}</div>
      </div>
      {deleteTarget && (
        <div
          role="presentation"
          className="fixed inset-0 z-[80] grid place-items-center bg-black/35 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-conversation-title"
            onClick={event => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="delete-conversation-title" className="text-base font-semibold text-gray-900">确定删除这个对话吗？</h2>
                <p className="mt-2 text-xs leading-6 text-gray-500">
                  “{deleteTarget.name}”将从当前学习空间移除。此操作不可撤销。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(Sidebar)
