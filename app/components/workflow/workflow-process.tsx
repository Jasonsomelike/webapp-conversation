import {
  useEffect,
  useRef,
  useState,
} from 'react'
import cn from 'classnames'
import NodePanel from './node'
import type { WorkflowProcess } from '@/types/app'
import CheckCircle from '@/app/components/base/icons/solid/general/check-circle'
import AlertCircle from '@/app/components/base/icons/solid/alert-circle'
import Loading02 from '@/app/components/base/icons/line/loading-02'
import ChevronRight from '@/app/components/base/icons/line/chevron-right'
import { WorkflowRunningStatus } from '@/types/app'

interface WorkflowProcessProps {
  data: WorkflowProcess
  grayBg?: boolean
  expand?: boolean
  hideInfo?: boolean
}
const WorkflowProcessItem = ({
  data,
  grayBg,
  expand = false,
  hideInfo = false,
}: WorkflowProcessProps) => {
  const running = data.status === WorkflowRunningStatus.Running
  const succeeded = data.status === WorkflowRunningStatus.Succeeded
  const failed = data.status === WorkflowRunningStatus.Failed || data.status === WorkflowRunningStatus.Stopped
  const [collapse, setCollapse] = useState(!(expand || data.expand || running))
  const wasRunning = useRef(running)

  useEffect(() => {
    if ((expand || data.expand || running) && !wasRunning.current)
    { setCollapse(false) }
    wasRunning.current = running
  }, [data.expand, expand, running])

  return (
    <div
      data-testid='workflow-process'
      className={cn(
        'chat-workflow-card min-w-0 w-full max-w-full overflow-hidden rounded-xl border border-[#17342b]/10 bg-[#f2f4f3]',
        collapse ? 'py-2.5' : 'pb-2 pt-2.5',
        hideInfo ? 'px-2' : 'px-3',
        grayBg && 'bg-gray-50',
      )}
    >
      <button
        type='button'
        aria-expanded={!collapse}
        className={cn(
          'flex h-5 w-full min-w-0 cursor-pointer items-center text-left',
          hideInfo && 'px-1',
        )}
        onClick={() => setCollapse(!collapse)}
      >
        {
          running && (
            <Loading02 className='shrink-0 mr-1 w-3 h-3 text-[#667085] animate-spin' />
          )
        }
        {
          succeeded && (
            <CheckCircle className='shrink-0 mr-1 w-3 h-3 text-[#12B76A]' />
          )
        }
        {
          failed && (
            <AlertCircle className='shrink-0 mr-1 w-3 h-3 text-[#F04438]' />
          )
        }
        <div className='min-w-0 grow truncate text-[13px] font-semibold leading-[18px] text-[#46554f]'>工作流</div>
        <span className={cn(
          'mr-1 text-[11px] font-medium',
          running && 'text-[#2970ff]',
          succeeded && 'text-[#16845b]',
          failed && 'text-[#d04438]',
        )}>
          {running ? '运行中' : succeeded ? '已完成' : failed ? '已停止' : ''}
        </span>
        <ChevronRight className={`ml-1 h-3.5 w-3.5 text-gray-500 transition-transform duration-200 ${collapse ? '' : 'rotate-90'}`} />
      </button>
      {
        !collapse && (
          <div className='mt-2 min-w-0 max-w-full space-y-1 overflow-hidden'>
            {
              data.tracing.map(node => (
                <div key={node.id || node.node_id} className='min-w-0 max-w-full overflow-hidden'>
                  <NodePanel
                    nodeInfo={node}
                    hideInfo={hideInfo}
                  />
                </div>
              ))
            }
          </div>
        )
      }
    </div>
  )
}

export default WorkflowProcessItem
