import Head from 'next/head';
import styles from '../components/Report.module.css';
import {
  DatePicker,
  Button,
  Select,
  Result,
  Spin,
  Statistic,
  Card,
  Row,
  Col,
  Form,
  Tag,
} from 'antd';
import {
  SearchOutlined,
  HistoryOutlined,
  ScheduleOutlined,
  PlusOutlined,
  CheckCircleFilled,
  MinusCircleFilled,
} from '@ant-design/icons';
import moment from 'moment';
import { useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import _get from 'lodash/get';

const { RangePicker } = DatePicker;
const { Option } = Select;

const DEFAULT_FORMAT = `DD-MM-YYYY HH:mm:ss`;
const FILTER_FORMAT = `YYYY-MM-DDTHH:mm:ss.SSS`;

const CHART_CHANNELS = [
  {
    channel: 'ivr',
    bg_color: 'rgb(60, 179, 113)',
    border_color: 'rgb(60, 179, 113, 0.2)',
  },
  {
    channel: 'web-chat',
    bg_color: 'rgba(255, 99, 132)',
    border_color: 'rgba(255, 99, 132, 0.2)',
  },
  {
    channel: 'facebook',
    bg_color: 'rgb(0, 0, 255)',
    border_color: 'rgb(0, 0, 255, 0.2)',
  },
  {
    channel: 'line',
    bg_color: 'rgb(255, 165, 0)',
    border_color: 'rgb(255, 165, 0, 0.2)',
  },
];

const MariReportError = () => {
  const [timeInterval, setTimeInterval] = useState(60);
  const [timePeriod, setTimePeriod] = useState('1m');
  const [timeFrame, setTimeFrame] = useState('1m');
  const [dateFilter, setDateFilter] = useState([]);
  const [dateStrFilter, setDateStrFilter] = useState([]);
  const [timeTag, setTimeTag] = useState('');
  // const [searchable, setSearchable] = useState(true);
  // const [chartData, setChartData] = useState(null);
  const [code, setCode] = useState('999');
  const [intervalID, setIntervalID] = useState(null);
  const [chartList, setChartList] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSelect = (value) => {
    console.log('value: ', value);
    setTimeInterval(value);
  };

  const handleSelectTimeFrame = (value) => {
    console.log('value: ', value);
    //let [_gte, _lte] = getTimeFilter(value);
    setTimeFrame(value);
    setChartList([]);
    setDateStrFilter([]);
  };

  const getTimeFilter = (time_frame) => {
    let _date_gte;
    let _date_lte = moment();
    let _time_tag = '';
    switch (time_frame) {
      case '1m':
        _time_tag = '1 ชั่วโมง';
        _date_gte = moment().subtract(1, 'hours');
        break;
      case '1h':
        _time_tag = '24 ชั่วโมง';
        _date_gte = moment().subtract(1, 'days');
        break;
      case '1d':
        _time_tag = '1 เดือน';
        _date_gte = moment().subtract(1, 'months');
        _date_gte = _date_gte
          .set('hour', '00')
          .set('minute', '00')
          .set('second', '00');
        break;
    }
    //let _datefilter = [_date_gte, _date_lte];
    ///setDateFilter(_datefilter);
    setTimeTag(_time_tag);
    return [_date_gte, _date_lte];
  };

  const intervalSearch = async () => {
    let _id = setInterval(async () => {
      await onSearch();
    }, 1000 * timeInterval);
    setIntervalID(_id);
  };

  const handleSearch = async () => {
    clearInterval(intervalID);
    await onSearch();
    //intervalSearch();
  };

  const onSearch = async () => {
    setLoading(true);
    setCode('999');
    // let _date_gte = moment().subtract(1, 'hours');
    // let _date_lte = moment();
    // setDateFilter([
    //   _date_gte.format(DEFAULT_FORMAT),
    //   _date_lte.format(DEFAULT_FORMAT),
    // ]);
    let [_gte, _lte] = getTimeFilter(timeFrame);
    setDateStrFilter([
      _gte.format(DEFAULT_FORMAT),
      _lte.format(DEFAULT_FORMAT),
    ]);
    let req = {
      gte: _gte.utc().format(FILTER_FORMAT) + 'Z',
      lte: _lte.utc().format(FILTER_FORMAT) + 'Z',
      time_frame: timeFrame,
    };

    let response = await axios({
      url: 'http://localhost:5000/reports/error',
      method: 'POST',
      data: { ...req },
    });
    // console.log('====== Response.Data ======');
    // console.log(response.data);
    let _buckets = _get(
      response.data,
      'result_data.aggregations.3.buckets',
      []
    );
    console.log('===== Buckets ====');
    console.log(_buckets);

    handleBucketsV2(_buckets);
    setCode(_buckets.length ? '200' : '404');
    setLoading(false);
  };

  const handleBucketsV2 = (buckets = []) => {
    let bucket_list = [];
    CHART_CHANNELS.forEach((obj) => {
      let _bucket_obj = buckets.find((buc) => buc.key === obj.channel);
      if (_bucket_obj) {
        let buckets_channel = _get(_bucket_obj, '2.buckets', []);
        let _format = ['1m', '1h'].includes(timeFrame)
          ? 'DD-MM-YYYY HH:mm:ss'
          : 'DD-MM-YYYY';
        let _data = [];
        let total_error = 0;
        buckets_channel.forEach((bc) => {
          let _error = _get(bc, '4.buckets[0].doc_count', 0);
          let _doc_count = _get(bc, 'doc_count');
          total_error += _error;
          let _value_percent = !_error
            ? 0
            : Number((_error / _doc_count) * 100).toFixed(2);
          _data.push({
            x: moment(_get(bc, 'key_as_string')).format(_format),
            y: _value_percent,
          });
        });

        let total = _get(_bucket_obj, 'doc_count');
        let error = total_error;
        let success = total - error;
        let percent_err = Number((error / total) * 100).toFixed(2);
        let percent_success = Number((success / total) * 100).toFixed(2);
        let _item = {
          total,
          success,
          error,
          percent_err,
          percent_success,
          channel: obj.channel,
          chart_data: {
            datasets: [
              {
                label: `${obj.channel.toUpperCase()} (%)`,
                data: _data,
                backgroundColor: obj.bg_color,
                borderColor: obj.border_color,
              },
            ],
          },
        };
        bucket_list.push(_item);
      }
    });
    setChartList(bucket_list);
    //setChartData(chart_data);
  };

  const numberFormat = (n) => {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const getResult = () => {
    if (code == '200') {
      const options = {
        scales: {
          yAxes: [
            {
              ticks: {
                beginAtZero: true,
              },
            },
          ],
        },
        plugins: {
          legend: {
            labels: {
              // This more specific font property overrides the global property
              font: {
                size: 12,
              },
            },
          },
        },
      };
      return (
        <>
          {chartList.map((item, index) => {
            return (
              <>
                <div>
                  <Row gutter={16} key={index}>
                    <Col span={6}>
                      <Card key={index}>
                        <Statistic
                          title={`Transaction (${String(
                            item.channel
                          ).toUpperCase()})`}
                          value={item.total}
                          key={index}
                          valueStyle={{
                            color: '#ff9933',
                            fontSize: '14px',
                            fontWeight: 'bold',
                          }}
                          prefix={<PlusOutlined key={index} />}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card key={index}>
                        <Statistic
                          title="Success"
                          value={`${numberFormat(item.success)} (${
                            item.percent_success
                          }%)`}
                          //precision={2}
                          valueStyle={{
                            color: '#3f8600',
                            fontSize: '14px',
                            fontWeight: 'bold',
                          }}
                          prefix={<CheckCircleFilled key={index} />}
                          //suffix="%"
                          key={index}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card key={index}>
                        <Statistic
                          title="Error"
                          value={`${numberFormat(item.error)} (${
                            item.percent_err
                          }%)`}
                          //precision={2}
                          valueStyle={{
                            color: '#cf1322',
                            fontSize: '14px',
                            fontWeight: 'bold',
                          }}
                          prefix={<MinusCircleFilled key={index} />}
                          //suffix="%"
                          key={index}
                        />
                      </Card>
                    </Col>
                  </Row>
                </div>
                <Line
                  key={index}
                  id={`id_${index}`}
                  data={item.chart_data}
                  height={90}
                  style={{
                    backgroundColor: 'rgb(255, 255, 255, 0.4)',
                  }}
                  options={options}
                />
                <p></p>
              </>
            );
          })}
        </>
      );
    } else if (code == '404') {
      return (
        <Result
          status="404"
          title="404"
          subTitle="Sorry, data not found."
          // extra={<Button type="primary">Back Home</Button>}
        />
      );
    } else {
      return null;
    }
  };

  return (
    <div className={styles.Flex_container}>
      <Head>
        <title>Mari Report</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        ></meta>
      </Head>
      <Spin tip="กำลังโหลด..." style={{ color: '#fff' }} spinning={loading}>
        <div className={styles.Search_bar}>
          <h2>Search Bar: </h2>
          <Form layout="inline">
            <Form.Item label="Time Frame">
              <Select
                defaultValue={timeFrame}
                style={{ width: 120 }}
                onChange={handleSelectTimeFrame}
              >
                <Option value={'1m'} key={1}>
                  <ScheduleOutlined /> 1 นาที
                </Option>
                <Option value={'1h'} key={2}>
                  <ScheduleOutlined /> 1 ชั่วโมง
                </Option>
                <Option value={'1d'} key={3}>
                  <ScheduleOutlined /> 1 วัน
                </Option>
                {/* <Option value={'1w'}>
                  <ScheduleOutlined /> 1 สัปดาห์
                </Option> */}
                {/* <Option value={'1M'}>
                  <ScheduleOutlined /> 1 เดือน
                </Option> */}
                {/* <Option value={'1h'}>
                  <ScheduleOutlined /> 1 ชั่วโมง
                </Option>
                <Option value={'1d'}>
                  <ScheduleOutlined /> 1 วัน
                </Option>
                <Option value={'1w'}>
                  <ScheduleOutlined /> 1 สัปดาห์
                </Option>
                <Option value={'1M'}>
                  <ScheduleOutlined /> 1 เดือน
                </Option> */}
              </Select>
            </Form.Item>
            <Form.Item label="Time Interval">
              <Select
                defaultValue={timeInterval}
                style={{ width: 120 }}
                onChange={handleSelect}
              >
                <Option value={60} key={1}>
                  <HistoryOutlined /> 1 นาที
                </Option>
                <Option value={60 * 5} key={2}>
                  <HistoryOutlined /> 5 นาที
                </Option>
                {/* <Option value={15}>
                  <HistoryOutlined /> 15 วินาที
                </Option>
                <Option value={20}>
                  <HistoryOutlined /> 20 วินาที
                </Option>
                <Option value={60}>
                  <HistoryOutlined /> 1 นาที
                </Option> */}
              </Select>
            </Form.Item>
            <Button
              type="danger"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              // disabled={searchable}
            >
              Search
            </Button>
          </Form>
          <p></p>
          <h3>
            {dateStrFilter.length > 0 && (
              <>
                <span
                  style={{
                    fontStyle: 'italic',
                    fontWeight: 'normal',
                    fontSize: '14px',
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>Filter :</span>{' '}
                  {/* {dateStrFilter[0]} - {dateStrFilter[1]} */}
                  <Tag color="#2db7f5">{dateStrFilter[0]}</Tag> to{' '}
                  <Tag color="#2db7f5">{dateStrFilter[1]}</Tag>{' '}
                  <Tag color="#f50">#{timeTag}</Tag>
                </span>
              </>
            )}
          </h3>
        </div>
        <p></p>
        <div className={styles.Report_container}>
          <h2>Chart Report: </h2>
          {getResult(code)}
        </div>
      </Spin>
    </div>
  );
};

export default MariReportError;
