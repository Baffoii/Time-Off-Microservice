import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';
import { HcmTimeoutError, HcmServerError, HcmNotFoundError } from '../../src/common/exceptions';

function makeHost(url = '/test') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status } as any;
  const request = { url } as any;
  return {
    host: {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as any,
    response,
    status,
    json,
  };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it('handles HttpException with string response', () => {
    const { host, status, json } = makeHost();
    filter.catch(new HttpException('bad request', HttpStatus.BAD_REQUEST), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, message: 'bad request' }));
  });

  it('handles HttpException with object response', () => {
    const { host, status, json } = makeHost();
    filter.catch(new HttpException({ message: 'validation failed' }, HttpStatus.UNPROCESSABLE_ENTITY), host);
    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'validation failed' }));
  });

  it('handles HcmTimeoutError as 504', () => {
    const { host, status, json } = makeHost();
    filter.catch(new HcmTimeoutError('getBalance'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.GATEWAY_TIMEOUT);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: HttpStatus.GATEWAY_TIMEOUT }));
  });

  it('handles HcmServerError as 502', () => {
    const { host, status, json } = makeHost();
    filter.catch(new HcmServerError(500, 'HCM down'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: HttpStatus.BAD_GATEWAY }));
  });

  it('handles HcmNotFoundError as 404', () => {
    const { host, status, json } = makeHost();
    filter.catch(new HcmNotFoundError('emp/loc'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: HttpStatus.NOT_FOUND }));
  });

  it('handles generic Error as 500', () => {
    const { host, status, json } = makeHost();
    filter.catch(new Error('something broke'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500, message: 'something broke' }));
  });

  it('handles unknown non-Error as 500', () => {
    const { host, status, json } = makeHost();
    filter.catch('some string error', host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Internal server error' }));
  });

  it('includes timestamp and path in all responses', () => {
    const { host, json } = makeHost('/some/path');
    filter.catch(new Error('err'), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/some/path', timestamp: expect.any(String) }),
    );
  });
});
